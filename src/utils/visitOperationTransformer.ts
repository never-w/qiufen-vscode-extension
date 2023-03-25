import { FieldNode, visit, print } from 'graphql'
import { OperationForFiledNodeAstType } from './formatOperationDefAst'

type NodeType = FieldNode & {
  checked: boolean
  key: string
}
function visitOperationTransformer(ast: OperationForFiledNodeAstType) {
  return visit(ast, {
    Field(node, key, parent, path, ancestors) {
      if (!(node as NodeType).checked) {
        return null
      }
    },
  })
}
export function printOperationStr(operationAstTree: OperationForFiledNodeAstType) {
  if (!operationAstTree) {
    return ''
  }

  const operationAst = visitOperationTransformer(operationAstTree)
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
