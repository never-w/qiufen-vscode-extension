import { FieldNode, Kind, OperationDefinitionNode, SelectionNode } from 'graphql'

type OperationOrFieldNodeType = OperationDefinitionNode | FieldNode
export type OperationForFiledNodeAstType = OperationOrFieldNodeType & {
  checked: boolean
  key: string
}

/**
 * 用于table select选择时对 operation ast tree操作格式化的函数
 */
export function formatOperationDefAst(ast: OperationOrFieldNodeType, checked: boolean, key: string, path: OperationOrFieldNodeType[] = [], isSelectionSetAction = false) {
  if (!ast) {
    return null
  }

  const newAst = { ...ast } as OperationForFiledNodeAstType

  // if (ast.kind === Kind.OPERATION_DEFINITION) {
  // newAst.key = ast.operation + ast.name?.value
  // }

  if (ast.kind === Kind.FIELD) {
    if (path.length === 1) {
      newAst.key = ast.name.value
    } else {
      const prefix = path
        .map((itm, index) => {
          if (index === 0) {
            return undefined
          }
          return itm.name?.value
        })
        .filter(Boolean)
        .join('')

      newAst.key = prefix + ast.name.value
    }

    newAst.checked = isSelectionSetAction ? checked : newAst.checked
  }

  if (newAst.key === key && ast.kind === Kind.FIELD) {
    newAst.checked = checked
    if (newAst?.selectionSet) {
      isSelectionSetAction = true
    }
  }

  const newPath = [...path, newAst]
  if (newAst?.selectionSet) {
    newAst.selectionSet.selections = newAst?.selectionSet?.selections?.map((selection) =>
      formatOperationDefAst(selection as FieldNode, checked, key, newPath, isSelectionSetAction),
    ) as SelectionNode[]
  }

  if (newAst?.selectionSet && ast.kind === Kind.FIELD) {
    const flag = (newAst.selectionSet.selections as OperationForFiledNodeAstType[])?.some((itm) => itm.checked)
    if (flag) {
      newAst.checked = true
    } else {
      newAst.checked = false
    }
  }

  return newAst
}

type FormatWorkspaceOperationDefsParams = {
  ast: OperationOrFieldNodeType
  keys?: string[]
  path?: OperationOrFieldNodeType[]
}
/**
 * 本地存在的operations的字段，用于格式化现在得到的远程最新的operation ast tree
 */
export function formatWorkspaceOperationDefsAst(params: FormatWorkspaceOperationDefsParams) {
  const { ast, path = [], keys = [] } = params

  if (!ast) {
    return null
  }

  const newAst = { ...ast } as OperationForFiledNodeAstType

  if (ast.kind === Kind.FIELD) {
    if (path.length === 1) {
      newAst.key = ast.name.value
    } else {
      const prefix = path
        .map((itm, index) => {
          if (index === 0) {
            return undefined
          }
          return itm.name?.value
        })
        .filter(Boolean)
        .join('')

      newAst.key = prefix + ast.name.value
    }

    // 默认只有field类型的字段才能有 checked属性
    newAst.checked = false
  }

  // 本地存在的field字段该node的checked = true
  if (ast.kind === Kind.FIELD && keys.includes(newAst.key)) {
    newAst.checked = true
  }

  const newPath = [...path, newAst]
  if (newAst?.selectionSet) {
    newAst.selectionSet.selections = newAst?.selectionSet?.selections?.map((selection) =>
      formatWorkspaceOperationDefsAst({
        ast: selection as OperationOrFieldNodeType,
        keys,
        path: newPath,
      }),
    ) as SelectionNode[]
  }

  return newAst
}

/**
 * 获取operation ast tree上checked为true的keys
 */
export function getOperationDefsAstKeys(ast: OperationForFiledNodeAstType, keys: string[] = []) {
  if (!ast) {
    return []
  }

  if (ast?.checked) {
    keys.push(ast.key)
  }

  if (ast?.selectionSet) {
    ast?.selectionSet?.selections?.forEach((selection) => getOperationDefsAstKeys(selection as OperationForFiledNodeAstType, keys))
  }

  return keys
}
