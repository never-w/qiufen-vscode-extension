import { TypedOperation } from '@fruits-chain/qiufen-helpers'
import { FieldNode, visit, print, GraphQLSchema, OperationDefinitionNode } from 'graphql'
import { buildOperationNodeForField } from './buildOperationNodeForField'

function visitOperationTransformer(ast: OperationDefinitionNode, selectedKeys: string[]) {
  return visit(ast, {
    Field(node, key, parent, path, ancestors) {
      const filterAncestors = ancestors.filter((_, index) => index % 3 === 0)
      filterAncestors.shift()

      const prefixKey = filterAncestors.reduce((pre, cur) => {
        return pre + (cur as FieldNode).name.value
      }, '')
      const nameKey = node.name.value
      const nodeKey = prefixKey + nameKey

      if (!selectedKeys.find((selectedKey) => selectedKey === nodeKey)) {
        return null
      }
    },
  })
}

export function printOperationStr(schema: GraphQLSchema, operation: TypedOperation, selectedKeys: string[]) {
  const operationDefsNodeAst = buildOperationNodeForField({
    schema,
    kind: operation.operationType,
    field: operation.name,
  })

  const operationAst = visitOperationTransformer(operationDefsNodeAst, selectedKeys)
  return print(operationAst)
}

// 本地回显获取keys
export function visitDocumentNodeAstGetKeys(ast: FieldNode | undefined, keys: string[]) {
  if (!ast) {
    keys = []
    return
  }

  return visit(ast, {
    Field(node, key, parent, path, ancestors) {
      const prefixKey = ancestors
        .filter((_, index) => index % 3 === 0)
        .reduce((pre, cur) => {
          return pre + (cur as FieldNode).name.value
        }, '')
      const nameKey = node.name.value
      const nodeKey = prefixKey + nameKey

      keys.push(nodeKey)
    },
  })
}
