import { OperationDefinitionNode } from 'graphql'
import { OperationDefinitionNodeGroupType } from './operations'
import { printWithComments } from './comment'

export function printOneOperation(
  ast: OperationDefinitionNodeGroupType | OperationDefinitionNode,
  isAllAddComment = false,
) {
  return printWithComments(ast, isAllAddComment)
}

export function printBatchOperations(asts: OperationDefinitionNodeGroupType[], isAllAddComment = false) {
  const operationListStr = asts.map((astNode) => printOneOperation(astNode, isAllAddComment))
  return operationListStr.join('\n\n')
}
