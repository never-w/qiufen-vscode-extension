import {
  parse,
  print,
  FieldNode,
  SelectionNode,
  DocumentNode,
  DefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  OperationDefinitionNode,
  VariableDefinitionNode,
} from 'graphql'

// 本地查询
const localQuery = `
query pageCostOrder($pageCostOrderInput: PageCostOrderInput, $page: Page) {
  pageCostOrder(pageCostOrderInput: $pageCostOrderInput, page: $page) {
    pageCurrent
    pageSize
    totalRecords
    records {
      key: billId
      applyCode
    }
  }
}`

// 远程查询
const remoteQuery = `
query pageCostOrder($pageCostOrderInput: PageCostOrderInput, $page: Page) {
  pageCostOrder(pageCostOrderInput: $pageCostOrderInput, page: $page) {
    pageCurrent
    pageSize
    totalRecords
    records {
      billIdwww
      applyCodeqwqwq
    }
  }
}`

// 解析查询为AST
const localAst: DocumentNode = parse(localQuery)
const remoteAst: DocumentNode = parse(remoteQuery)

// 函数：检查参数名称冲突
function hasConflictingVariableDefinitions(localVars: ReadonlyArray<VariableDefinitionNode>, remoteVars: ReadonlyArray<VariableDefinitionNode>): boolean {
  const localNames = localVars.map((v) => v.variable.name.value)
  const remoteNames = remoteVars.map((v) => v.variable.name.value)
  return localNames.some((name) => remoteNames.includes(name))
}

type CanWrite<T> = {
  -readonly [K in keyof T]: T[K]
}

// 递归更新本地AST
function updateAst(localNode: any, remoteNode: any): DefinitionNode | null {
  if (localNode.kind === 'Field' && remoteNode.kind === 'Field') {
    if (localNode.name.value !== remoteNode.name.value) {
      return null
    }
    ;(localNode as FieldNode).alias = localNode.alias || remoteNode.alias
  }

  if (localNode.selectionSet && remoteNode.selectionSet) {
    localNode.selectionSet.selections = localNode.selectionSet.selections
      .map((localSelection) => {
        const remoteSelection = remoteNode.selectionSet!.selections.find((remoteSelection) => remoteSelection.name.value === localSelection.name.value)
        if (!remoteSelection) {
          return null
        }
        return updateAst(localSelection, remoteSelection)
      })
      .filter((selection) => selection !== null) as SelectionNode[]
  }

  if (localNode.kind === 'ObjectTypeDefinition' && remoteNode.kind === 'ObjectTypeDefinition') {
    const localObjectTypeNode = localNode as ObjectTypeDefinitionNode
    const remoteObjectTypeNode = remoteNode as ObjectTypeDefinitionNode
    localObjectTypeNode.fields = localObjectTypeNode.fields
      .map((localField) => {
        const remoteField = remoteObjectTypeNode.fields.find((remoteField) => remoteField.name.value === localField.name.value)
        if (!remoteField) {
          return null
        }
        return updateAst(localField, remoteField) as FieldNode
      })
      .filter((field) => field !== null)
  }

  if (localNode.kind === 'InterfaceTypeDefinition' && remoteNode.kind === 'InterfaceTypeDefinition') {
    const localInterfaceNode = localNode as InterfaceTypeDefinitionNode
    const remoteInterfaceNode = remoteNode as InterfaceTypeDefinitionNode
    localInterfaceNode.fields = localInterfaceNode.fields
      .map((localField) => {
        const remoteField = remoteInterfaceNode.fields.find((remoteField) => remoteField.name.value === localField.name.value)
        if (!remoteField) {
          return null
        }
        return updateAst(localField, remoteField) as FieldNode
      })
      .filter((field) => field !== null)
  }

  if (localNode.kind === 'UnionTypeDefinition' && remoteNode.kind === 'UnionTypeDefinition') {
    const localUnionNode = localNode as UnionTypeDefinitionNode
    const remoteUnionNode = remoteNode as UnionTypeDefinitionNode
    localUnionNode.types = localUnionNode.types.filter((localType) => {
      return remoteUnionNode.types.some((remoteType) => remoteType.name.value === localType.name.value)
    })
  }

  if (localNode.kind === 'OperationDefinition' && remoteNode.kind === 'OperationDefinition') {
    const localOperationNode = localNode as OperationDefinitionNode
    const remoteOperationNode = remoteNode as OperationDefinitionNode

    // 检查并解决参数名称冲突
    if (hasConflictingVariableDefinitions(localOperationNode.variableDefinitions, remoteOperationNode.variableDefinitions)) {
      remoteOperationNode.variableDefinitions.forEach((remoteVar) => {
        const localVar = localOperationNode.variableDefinitions.find((localVar) => localVar.variable.name.value === remoteVar.variable.name.value)
        if (!localVar) {
          localOperationNode.variableDefinitions.push(remoteVar)
        } else if (localVar.type.toString() !== remoteVar.type.toString()) {
          localVar.type = remoteVar.type
        }
      })
    }
  }

  return localNode
}

// 更新本地AST
const updatedLocalAst: DocumentNode = {
  ...localAst,
  definitions: localAst.definitions
    .map((localDefinition) => {
      const remoteDefinition = remoteAst.definitions.find(
        (remoteDefinition) => remoteDefinition.kind === localDefinition.kind && remoteDefinition.name.value === localDefinition.name.value,
      )
      if (!remoteDefinition) {
        return null
      }
      return updateAst(localDefinition, remoteDefinition)
    })
    .filter((definition) => definition !== null) as DefinitionNode[],
}

// 将AST转换回查询字符串
const updatedLocalQuery: string = print(updatedLocalAst)
console.log(updatedLocalQuery)
