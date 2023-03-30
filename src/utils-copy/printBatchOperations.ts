import { OperationDefinitionNode, print } from 'graphql'
import { OperationDefinitionNodeGroupType } from './operations'

export function printOneOperation(ast: OperationDefinitionNodeGroupType | OperationDefinitionNode) {
  return print(ast)
}

export function printBatchOperations(asts: OperationDefinitionNodeGroupType[]) {
  const operationListStr = asts.map((astNode) => printOneOperation(astNode))
  return operationListStr.join('\n\n')
}
