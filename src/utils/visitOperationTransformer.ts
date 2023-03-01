import { FieldNode, DocumentNode, Kind, visit } from "graphql"

function visitOperationTransformer(ast: DocumentNode, selectedKeys: string[]) {
  return visit(ast, {
    enter(node, key, parent, path, ancestors) {
      if (node.kind === Kind.FIELD) {
        // 格式化出表单渲染的key
        const prefixKey = ancestors
          .slice(4, ancestors.length)
          .filter((_, index) => (index - 1) % 3 === 0)
          .reduce((pre, cur) => {
            return pre + (cur as FieldNode).name.value
          }, "")
        const nameKey = node.name.value
        const nodeKey = prefixKey + nameKey

        if (!selectedKeys.find((selectedKey) => selectedKey === nodeKey)) {
          return null
        }
      }
    },
  })
}

export default visitOperationTransformer
