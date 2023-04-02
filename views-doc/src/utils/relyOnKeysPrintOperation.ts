import { Kind, OperationDefinitionNode, parse, visit } from 'graphql'
import { NewFieldNodeType } from './interface'
import { OperationDefinitionNodeGroupType } from './operations'
import { printOneOperation } from './printBatchOperations'

export function relyOnKeysPrintOperation(operationDefAst: OperationDefinitionNodeGroupType | OperationDefinitionNode, keys: string[]) {
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
    const operationStr = printOneOperation(updateOperationDefAst)
    parse(operationStr)
    return Promise.resolve(operationStr)
  } catch {
    return Promise.reject('GraphQLError: Syntax Error')
  }
}
