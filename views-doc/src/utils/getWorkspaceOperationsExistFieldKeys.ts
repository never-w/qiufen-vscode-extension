import { FieldNode, InlineFragmentNode, Kind, visit } from 'graphql'

// 本地回显获取keys
export function getWorkspaceOperationsExistFieldKeys(ast: FieldNode | undefined, keys: string[] = []) {
  if (!ast) {
    return []
  }

  visit(ast, {
    enter(node, key, parent, path, ancestors) {
      if (node.kind === Kind.FIELD || node.kind === Kind.INLINE_FRAGMENT) {
        const nodeName = (node as FieldNode)?.name?.value || (node as InlineFragmentNode)?.typeCondition?.name?.value

        const prefixKey = ancestors
          .filter((_, index) => index % 3 === 0)
          .reduce((pre, cur) => {
            return pre + ((cur as FieldNode).name?.value || (cur as InlineFragmentNode)?.typeCondition?.name?.value)
          }, '')

        const nodeKey = prefixKey + nodeName

        keys.push(nodeKey)
      }
    },
  })

  return keys
}
