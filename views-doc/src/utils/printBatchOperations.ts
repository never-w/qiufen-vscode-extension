import {
  printWithComments,
  type OperationDefinitionNodeGroupType,
} from '@fruits-chain/qiufen-pro-helpers'

import type { OperationDefinitionNode } from 'graphql'

export function printOneOperation(
  ast: OperationDefinitionNodeGroupType | OperationDefinitionNode,
  isAllAddComment = false,
) {
  return printWithComments(ast, isAllAddComment)
}

export function printBatchOperations(
  asts: OperationDefinitionNodeGroupType[],
  isAllAddComment = false,
) {
  const operationListStr = asts.map(astNode =>
    printOneOperation(astNode, isAllAddComment),
  )
  return operationListStr.join('\n\n')
}
