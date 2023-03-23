import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import { FieldNode, DocumentNode, Kind, visit, print, GraphQLSchema, parse } from "graphql"
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

        // 不存在的key就让该节点删除掉
        if (!selectedKeys.find((selectedKey) => selectedKey === nodeKey)) {
          return null
        }
      }
    },
  })
}

export function printGqlOperation(schema: GraphQLSchema, operation: TypedOperation, uniqTmpSelectedKeys: string[]) {
  const operationStrGql = printOperationNodeForField({
    schema,
    kind: operation.operationType,
    field: operation.name,
  })

  const documentNode = parse(operationStrGql, { noLocation: true })
  const operationAst = visitOperationTransformer(documentNode, uniqTmpSelectedKeys)
  return print(operationAst)
}

export function printOperation(schema: GraphQLSchema, operation: TypedOperation) {
  const operationStr = printOperationNodeForField({
    schema,
    kind: operation.operationType,
    field: operation.name,
  })

return operationStr
}
