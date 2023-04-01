// @ts-nocheck
import { parse, print, OperationDefinitionNode, DefinitionNode, FieldNode, DocumentNode, visit } from 'graphql'

// 在更新参数类型时检查是否存在重名参数
function findNonConflictingParamName(paramName: string, remoteVarDefs: ReadonlyArray<VariableDefinitionNode>, localVarDefs: ReadonlyArray<VariableDefinitionNode>): string {
  let updatedName = paramName
  let i = 1

  const remoteParamNames = remoteVarDefs.map((def) => def.variable.name.value)
  const localParamNames = localVarDefs.map((def) => def.variable.name.value)

  while (remoteParamNames.includes(updatedName) || localParamNames.includes(updatedName)) {
    updatedName = `${paramName}_${i}`
    i++
  }

  return updatedName
}

// 对本地查询进行更新以使其与远程查询一致
function syncLocalOperation(localOperation: string, remoteOperation: string): string {
  /* 解析本地和远程查询 */
  const localAst: DocumentNode = parse(localOperation)
  const remoteAst: DocumentNode = parse(remoteOperation)

  /* 定义用于AST节点比较的辅助函数 */
  function fieldNameEquals(a: FieldNode, b: FieldNode): boolean {
    return (!a.alias && a.name.value === b.name.value) || (a.alias && a.alias.value === b.name.value)
  }

  /* 使用visitor模式遍历并更新AST */
  const updatedAst: DocumentNode = visit(localAst, {
    OperationDefinition: {
      enter(node: OperationDefinitionNode) {
        // 更新变量定义
        node.variableDefinitions?.forEach((variableDefinition) => {
          const matchingVariable = remoteAst.definitions
            .flatMap((def: DefinitionNode) => ('variableDefinitions' in def ? def.variableDefinitions : []))
            .find((remoteVarDef) => remoteVarDef.variable.name.value === variableDefinition.variable.name.value)

          if (matchingVariable) {
            variableDefinition.type = matchingVariable.type
          } else {
            const newName = findNonConflictingParamName(
              variableDefinition.variable.name.value,
              remoteAst.definitions.flatMap((def: DefinitionNode) => ('variableDefinitions' in def ? def.variableDefinitions : [])),
              node.variableDefinitions,
            )

            if (newName !== variableDefinition.variable.name.value) {
              variableDefinition.variable.name.value = newName
            }
          }
        })

        // 遍历节点的选择集
        node.selectionSet?.selections.forEach((field, index, selections) => {
          const matchingField = remoteAst.definitions
            .flatMap((def: DefinitionNode) => ('selectionSet' in def ? def.selectionSet.selections : []))
            .find((remoteField: FieldNode) => fieldNameEquals(field as FieldNode, remoteField))

          if (!matchingField) {
            // 删除不存在于远程查询中的字段
            selections.splice(index, 1)
          }
        })

        // 添加本地查询中缺失的字段
        remoteAst.definitions
          .flatMap((def: DefinitionNode) => ('selectionSet' in def ? def.selectionSet.selections : []))
          .forEach((remoteField) => {
            const hasMatchingField = node.selectionSet.selections.some((field) => fieldNameEquals(field as FieldNode, remoteField as FieldNode))

            if (!hasMatchingField) {
              node.selectionSet.selections.push(remoteField)
            }
          })
      },
    },
    Field: {
      enter(node: FieldNode) {
        const matchingField = remoteAst.definitions
          .flatMap((def: DefinitionNode) => ('selectionSet' in def ? def.selectionSet.selections : []))
          .find((remoteField: FieldNode) => fieldNameEquals(node, remoteField))
        console.log(matchingField, ' ++')

        if (matchingField) {
          // 更新字段的选择集（包括子字段）
          node.selectionSet = matchingField.selectionSet

          // 保留别名和自定义指令（如果有）
          if (node.alias) {
            node.alias = matchingField.alias || node.alias
          }
          if (node.directives) {
            node.directives = matchingField.directives || matchingField.directives
          }
        }
      },
    },
  })

  // 生成并返回更新的操作字符串
  return print(updatedAst)
}

// 本地查询
const localQuery = `
query SearchProductsAndServices($searchQuery: String!) {
  searchResults: search(query: $searchQuery) {
    ... on Product {
      w: id
      name 
      productPrice: price {
        value @mock
        currency
        discount
      }
    }
    ... on Service {
      id
      name
      servicePrice: price {
        value
        currency
        isMemberPrice
      }
    }
  }
}
`

// 远程查询
const remoteQuery = `
query SearchProductsAndServices($searchQuery: Int!) {
  searchResults: search(query: $searchQuery) {
    ... on Product {
      id
      productPrice: price {
        value
        currency
        discount
      }
    }
    ... on Service {
      id
      name
      wyq
    }
  }
}
`

const oldStr = `
  query pageCostOrder($pageCostOrderInput: PageCostOrderInput, $page: Page) {
  pageCostOrder(pageCostOrderInput: $pageCostOrderInput, page: $page) {
    www: pageCurrent
    pageSize
    totalRecords
    records {
      billIdwww
      billId @mock
      applyCodeqwqwq
    }
  }
}
`

const newStr = `
  query pageCostOrder($pageCostOrderInput: PageCostOrderInput1, $page: Page2) {
  pageCostOrder(pageCostOrderInput: $pageCostOrderInput, page: $page) {
    pageCurrent
    records {
      billIdwww
      billId
      applyCodeqwqwq
      nammmm
    }
  }
}
`

console.log(syncLocalOperation(oldStr, newStr))
