import {
  DefinitionNode,
  Kind,
  FieldNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
  VariableNode,
  ExecutableDefinitionNode,
  SelectionNode,
  InlineFragmentNode,
  ArgumentNode,
} from 'graphql'
import { capitalizeFirstLetter } from './dealWordFirstLetter'

type CanWrite<T> = {
  -readonly [K in keyof T]: T[K]
}

type ConflictingVariablesNames = {
  variableName: string
  newVariableName: string
}

/** 递归遍历得到operation字段上的所有arguments */
function getArguments(astNode: OperationDefinitionNode | FieldNode | InlineFragmentNode, args: (ArgumentNode | null)[] = []) {
  if (astNode.kind === Kind.FIELD) {
    args.push((astNode?.arguments || null) as unknown as ArgumentNode)
  }

  if (astNode.selectionSet) {
    astNode.selectionSet!.selections.forEach((item) => {
      getArguments(item as FieldNode, args)
    })
  }

  return args
    .filter(Boolean)
    .flat(Infinity)
    .map((itm) => (itm?.value as VariableNode)?.name?.value) as string[]
}

// 函数：检查参数名称冲突
function hasConflictingVariableDefinitions(filteredVars: ReadonlyArray<VariableDefinitionNode>, remoteVar: VariableDefinitionNode): boolean {
  const filteredNames = filteredVars.map((v) => v.variable.name.value)
  const remoteName = remoteVar.variable.name.value

  return filteredNames.some((name) => remoteName === name)
}

export function updateWorkspaceDocument(
  workspaceDefNode: DefinitionNode | FieldNode | InlineFragmentNode,
  remoteDefNode: DefinitionNode | FieldNode | InlineFragmentNode,
  remoteConflictingVariablesNames: ConflictingVariablesNames[] = [],
): DefinitionNode | null {
  const localNode = workspaceDefNode as unknown as CanWrite<FieldNode> | ExecutableDefinitionNode
  const remoteNode = remoteDefNode as unknown as FieldNode | ExecutableDefinitionNode
  let filteredNotUpdateField: FieldNode[] = []

  if (localNode.kind === 'OperationDefinition' && remoteNode.kind === 'OperationDefinition') {
    const localOperationNode = localNode as CanWrite<OperationDefinitionNode>
    const remoteOperationNode = remoteNode as OperationDefinitionNode

    if (localOperationNode.selectionSet?.selections.length > 1) {
      // 聚合接口
      const args = getArguments({
        ...localOperationNode,
        selectionSet: {
          ...localOperationNode.selectionSet,
          selections: localOperationNode.selectionSet!.selections.filter(
            (selection) => (selection as FieldNode).name.value !== (remoteOperationNode.selectionSet!.selections[0] as FieldNode).name.value,
          ),
        },
      })

      // 这里是得到聚合接口不需要更新的参数，是在 OperationDefinition层级上的参数
      const filterLocalOperationNodeVariables = localOperationNode.variableDefinitions?.filter((varItm) => args.includes(varItm.variable.name.value)) || []
      const filteredLocalOperationNodeVariablesNames = filterLocalOperationNodeVariables.map((v) => v.variable.name.value)
      // 得到远程的 OperationDefinition层级上的参数，并解决名称冲突
      const remoteOperationNodeVariables =
        remoteOperationNode.variableDefinitions?.map((varItm) => {
          if (hasConflictingVariableDefinitions(filterLocalOperationNodeVariables, varItm)) {
            const newNameValue = `${remoteOperationNode.name?.value}${capitalizeFirstLetter(varItm.variable.name.value)}`
            const isStillConflicting = filteredLocalOperationNodeVariablesNames.includes(newNameValue)
            // 如果还是冲突就加上时间戳后缀
            const nameDate = +new Date()
            const value = isStillConflicting ? `${newNameValue}${nameDate}` : newNameValue

            remoteConflictingVariablesNames.push({
              variableName: varItm.variable.name.value,
              newVariableName: value,
            })

            return {
              ...varItm,
              variable: {
                ...varItm.variable,
                name: {
                  ...varItm.variable.name,
                  value,
                },
              },
            }
          }

          return varItm
        }) || []

      localOperationNode.variableDefinitions = [...remoteOperationNodeVariables, ...filterLocalOperationNodeVariables]
    } else {
      // 普通接口
      localOperationNode.variableDefinitions = remoteOperationNode.variableDefinitions
    }

    // 聚合接口式，过滤出来不需要更新的 Field
    filteredNotUpdateField =
      (localNode.selectionSet!.selections.filter(
        (itm) => (itm as FieldNode).name.value !== (remoteNode.selectionSet!.selections[0] as FieldNode).name.value,
      ) as unknown as FieldNode[]) || []
  }

  // 字段类型更新
  if (localNode.kind === 'Field' && remoteNode.kind === 'Field') {
    if (localNode.name.value !== remoteNode.name.value) {
      return null
    }

    // 这里是为了解决参数冲突时，改掉FieldNode上对应位置的参数
    localNode.arguments = remoteNode.arguments?.map((arg) => {
      const conflictingArg = remoteConflictingVariablesNames.find((itm) => itm.variableName === (arg.value as VariableNode).name.value)

      if (conflictingArg) {
        return {
          ...arg,
          value: {
            ...arg.value,
            name: {
              ...(arg.value as VariableNode).name,
              value: conflictingArg.newVariableName,
            },
          },
        }
      }

      return arg
    })

    localNode.alias = localNode.alias || remoteNode.alias
  }

  // 根据selectionSet 递归条件
  if (localNode.selectionSet && remoteNode.selectionSet) {
    // 更新已有字段
    localNode.selectionSet.selections = localNode.selectionSet.selections
      .map((localSelection) => {
        if (localSelection.kind === Kind.INLINE_FRAGMENT) {
          const remoteSelection = remoteNode.selectionSet!.selections.find(
            (remoteSelection) => (remoteSelection as InlineFragmentNode).typeCondition?.name.value === localSelection.typeCondition?.name.value,
          )
          if (!remoteSelection) {
            return null
          }
          return updateWorkspaceDocument(localSelection, remoteSelection as FieldNode, remoteConflictingVariablesNames)
        } else if (localSelection.kind === Kind.FRAGMENT_SPREAD) {
          // TODO 这种类型暂时没有涉及到
        } else {
          const remoteSelection = remoteNode.selectionSet!.selections.find((remoteSelection) => (remoteSelection as FieldNode).name?.value === localSelection.name.value)
          if (!remoteSelection) {
            return null
          }
          return updateWorkspaceDocument(localSelection, remoteSelection as FieldNode, remoteConflictingVariablesNames)
        }
      })
      .filter(Boolean) as unknown as SelectionNode[]

    // 添加新字段
    remoteNode.selectionSet.selections.forEach((remoteSelection) => {
      if (remoteSelection.kind === Kind.INLINE_FRAGMENT) {
        if (
          !localNode.selectionSet!.selections.some(
            (localSelection) => (localSelection as InlineFragmentNode).typeCondition?.name.value === remoteSelection.typeCondition?.name.value,
          )
        ) {
          // @ts-ignore
          localNode.selectionSet!.selections.push(remoteSelection)
        }
      } else if (remoteSelection.kind === Kind.FRAGMENT_SPREAD) {
        // TODO 这种类型暂时没有涉及到
      } else {
        if (!localNode.selectionSet!.selections.some((localSelection) => (localSelection as FieldNode).name?.value === remoteSelection.name.value)) {
          // @ts-ignore
          localNode.selectionSet!.selections.push(remoteSelection)
        }
      }
    })
  }

  if (localNode.kind === 'OperationDefinition' && remoteNode.kind === 'OperationDefinition' && filteredNotUpdateField.length) {
    // 聚合接口更新方式
    return {
      ...localNode,
      selectionSet: {
        ...localNode.selectionSet,
        selections: [...localNode.selectionSet.selections, ...filteredNotUpdateField],
      },
    } as DefinitionNode
  } else {
    return localNode as DefinitionNode
  }
}
