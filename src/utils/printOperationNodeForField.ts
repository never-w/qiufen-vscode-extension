import { GraphQLSchema, OperationTypeNode, print } from 'graphql'
import { buildOperationNodeForField, Ignore, SelectedFields } from './buildOperationNodeForField'

export default function printOperationNodeForField({
  schema,
  kind,
  field,
  models,
  ignore = [],
  depthLimit,
  circularReferenceDepth,
  argNames,
  selectedFields = true,
}: {
  schema: GraphQLSchema
  kind: OperationTypeNode
  /** eg. search */
  field: string
  models?: string[]
  ignore?: Ignore
  depthLimit?: number
  circularReferenceDepth?: number
  argNames?: string[]
  selectedFields?: SelectedFields
}) {
  return print(
    buildOperationNodeForField({
      schema,
      kind,
      field,
      models,
      ignore,
      depthLimit,
      circularReferenceDepth,
      argNames,
      selectedFields,
    }),
  )
}
