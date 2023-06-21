import { getNamedType, isEnumType, isScalarType } from 'graphql'

import type { InputType, ScalarMap } from '@fruits-chain/qiufen-pro-helpers'
import type {
  ConstDirectiveNode,
  GraphQLField,
  GraphQLInputType,
  OperationDefinitionNode,
} from 'graphql'
import type { Maybe } from 'graphql/jsutils/Maybe'

export type OperationDefsAstArgsType = {
  name: string
  description: Maybe<string>
  defaultValue: unknown
  deprecationReason: Maybe<string>
  directives: readonly ConstDirectiveNode[] | undefined
  type: InputType
}
export type OperationDefinitionNodeGroupType = OperationDefinitionNode & {
  operationDefinitionDescription: string
  namedTypeList?: string[]
  variableTypeList?: string[]
  args: OperationDefsAstArgsType[]
}

/**
 * grouping logic
 * @param operation - the operation need to be grouped
 */
const _groupBy: GroupByFn = (operation: OperationDefinitionNodeGroupType) => {
  const [groupName, description] =
    operation.operationDefinitionDescription?.includes(':')
      ? operation.operationDefinitionDescription.split(/[:]\s*/)
      : ['default', operation.operationDefinitionDescription]
  const groupOperation = { description, ...operation }
  return { groupName, operation: groupOperation }
}

export interface GroupByFn {
  (operation: OperationDefinitionNodeGroupType): {
    groupName: string
    operation: OperationDefinitionNodeGroupType
  }
}

/**
 * separate operations into some groups
 * @param operations - the operations need to be grouped
 * @param groupBy - the grouping logic function
 */
export function groupOperations(
  operations: OperationDefinitionNodeGroupType[],
  groupBy: GroupByFn = _groupBy,
) {
  const groupMap: Record<string, OperationDefinitionNodeGroupType[]> = {}
  operations.forEach(originOperation => {
    const { groupName, operation } = groupBy(originOperation)
    if (groupMap[groupName]) {
      groupMap[groupName].push(operation)
    } else {
      groupMap[groupName] = [operation]
    }
  })
  return groupMap
}

function _normalizeGraphqlInputType(
  type: GraphQLInputType,
  refChain: string[] = [],
): InputType {
  const namedType = getNamedType(type)
  const typeName = type.toString()
  const ofTypeName = namedType.name
  // handle ref cycle
  const refCount = refChain.filter(item => item === ofTypeName).length

  if (isScalarType(namedType)) {
    return {
      kind: 'Scalar',
      name: typeName,
      ofName: ofTypeName,
    }
  }
  if (isEnumType(namedType)) {
    return {
      kind: 'Enum',
      name: typeName,
      ofName: ofTypeName,
      values: namedType.getValues().map(item => ({
        name: item.name,
        description: item.description,
        value: item.value,
        deprecationReason: item.deprecationReason,
        directives: item.astNode?.directives,
      })),
    }
  }
  return {
    kind: 'InputObject',
    name: typeName,
    ofName: ofTypeName,
    fields:
      refCount > 3
        ? []
        : Object.values(namedType.getFields()).map(item => {
            return {
              name: item.name,
              description: item.description,
              defaultValue: item.defaultValue,
              deprecationReason: item.deprecationReason,
              directives: item.astNode?.directives,
              type: _normalizeGraphqlInputType(item.type, [
                ...refChain,
                namedType.name,
              ]),
            }
          }),
  }
}

export function normalizeGraphqlField(
  graphQLField: GraphQLField<unknown, unknown>,
) {
  const args = graphQLField?.args.map(item => {
    return {
      name: item.name,
      description: item.description,
      defaultValue: item.defaultValue,
      deprecationReason: item.deprecationReason,
      directives: item.astNode?.directives,
      type: _normalizeGraphqlInputType(item.type),
    }
  })

  return (args || []) as OperationDefsAstArgsType[]
}

/**
 * generate a input object
 * @param args - the arguments of operation
 * @param scalarMap - a map contains the default value of scalar type
 */
export const genArgsExample = (
  args: OperationDefsAstArgsType[],
  scalarMap: ScalarMap = {},
) => {
  const argsExample: Record<string, unknown> = {}
  args.forEach(({ name, type }) => {
    let result
    let scalarHandler
    switch (type.kind) {
      case 'Scalar':
        scalarHandler = scalarMap[type.ofName]
        result = scalarHandler
          ? typeof scalarHandler === 'function'
            ? scalarHandler()
            : scalarHandler
          : null
        break
      case 'Enum':
        result = type.values[0].value
        break
      case 'InputObject':
        result = genArgsExample(
          type.fields as OperationDefsAstArgsType[],
          scalarMap,
        )
        break
    }
    argsExample[name] = genListTypeValue(type.name, result)
  })
  return argsExample
}

function genListTypeValue(typeName: string, value: unknown) {
  const listPattern = /^\[(.+)\]!?$/
  let ofTypeName = typeName.match(listPattern)?.[1]
  let result = value

  while (ofTypeName) {
    result = [result]
    ofTypeName = ofTypeName.match(listPattern)?.[1]
  }
  return result
}
