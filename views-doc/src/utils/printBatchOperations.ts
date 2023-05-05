import { OperationDefinitionNode, print } from 'graphql'
import { OperationDefinitionNodeGroupType } from './operations'
import { printWithComments } from './comment'

export function printOneOperation(ast: OperationDefinitionNodeGroupType | OperationDefinitionNode) {
  return printWithComments(ast)
}

export function printBatchOperations(asts: OperationDefinitionNodeGroupType[]) {
  const operationListStr = asts.map((astNode) => printOneOperation(astNode))
  return operationListStr.join('\n\n')
}
