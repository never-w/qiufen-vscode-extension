import { Kind, parse, visit } from 'graphql'

import { printOneOperation } from './printBatchOperations'

import type {
  NewFieldNodeType,
  OperationDefinitionNodeGroupType,
} from '@fruits-chain/qiufen-pro-helpers'
import type { OperationDefinitionNode } from 'graphql'

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
    const operationStr = printOneOperation(
      updateOperationDefAst,
      isAllAddComment,
    )
    parse(operationStr)
    return Promise.resolve(operationStr)
  } catch {
    return Promise.reject('请选择接口相应的字段')
  }
}
