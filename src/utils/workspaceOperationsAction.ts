import { FieldNode, visit } from 'graphql'

// 本地回显获取keys
export function getWorkspaceOperationsExistFieldKeys(ast: FieldNode | undefined, keys: string[] = []) {
  if (!ast) {
    return []
  }

  visit(ast, {
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

  return keys
}
