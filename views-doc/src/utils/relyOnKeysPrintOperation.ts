import { Kind, OperationDefinitionNode, parse, visit } from 'graphql'
import { NewFieldNodeType } from './interface'
import { OperationDefinitionNodeGroupType } from './operations'
import { printOneOperation } from './printBatchOperations'

export function relyOnKeysPrintOperation(
  operationDefAst: OperationDefinitionNodeGroupType | OperationDefinitionNode,
  keys: string[],
  isAllAddComment = false,
) {
  const updateOperationDefAst = visit(operationDefAst, {
    enter(node, key, parent, path, ancestors) {
      if (node.kind === Kind.FIELD || node.kind === Kind.INLINE_FRAGMENT) {
        const fieldKey = (node as NewFieldNodeType)?.fieldKey
        if (!keys.includes(fieldKey)) {
          return null
        }
      }
    },
  })

  try {
    const operationStr = printOneOperation(updateOperationDefAst, isAllAddComment)
    parse(operationStr)
    return Promise.resolve(operationStr)
  } catch {
    return Promise.reject('Please select the operation fields')
  }
}
