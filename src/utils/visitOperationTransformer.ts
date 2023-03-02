import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import { FieldNode, DocumentNode, Kind, visit, print, GraphQLSchema } from "graphql"
import parseOperationToAst from "./parseOperationToAst"
import printOperationNodeForField from "./printOperationNodeForField"

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

export function printGqlOperation(schema: GraphQLSchema, operation: TypedOperation, uniqTmpSelectedKeys: string[]) {
  const operationAst = visitOperationTransformer(
    parseOperationToAst(
      printOperationNodeForField({
        schema,
        kind: operation.operationType,
        field: operation.name,
      })
    ),
    uniqTmpSelectedKeys
  )
  return print(operationAst)
}
