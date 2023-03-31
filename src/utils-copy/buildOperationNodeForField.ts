import {
  GraphQLSchema,
  GraphQLObjectType,
  isObjectType,
  getNamedType,
  isUnionType,
  OperationDefinitionNode,
  VariableDefinitionNode,
  isNonNullType,
  SelectionNode,
  InlineFragmentNode,
  GraphQLNamedType,
  SelectionSetNode,
  isScalarType,
  TypeNode,
  isListType,
  ArgumentNode,
  GraphQLField,
  GraphQLArgument,
  GraphQLInputType,
  GraphQLList,
  ListTypeNode,
  GraphQLNonNull,
  NonNullTypeNode,
  OperationTypeNode,
  isInterfaceType,
  isEnumType,
  Kind,
} from 'graphql'
import { getFieldNodeType } from './getFieldNodeType'
import { normalizeGraphqlField, OperationDefinitionNodeGroupType } from './operations'
// import { capitalizeFirstLetter } from "./dealWordFirstLetter"

import { getDefinedRootType, getRootTypeNames } from './rootTypes'

let operationVariables: VariableDefinitionNode[] = []
let fieldTypeMap = new Map()

function addOperationVariable(variable: VariableDefinitionNode) {
  operationVariables.push(variable)
}

function resetOperationVariables() {
  operationVariables = []
}

function resetFieldMap() {
  fieldTypeMap = new Map()
}

export type Skip = string[]
export type Force = string[]
export type Ignore = string[]

export type SelectedFields =
  | {
      [key: string]: SelectedFields
    }
  | boolean

export function buildOperationNodeForField({
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
  resetOperationVariables()
  resetFieldMap()

  /** root "Query | MUTATION | SUBSCRIPTION" */
  const rootTypeNames = getRootTypeNames(schema)

  const operationNode = buildOperationAndCollectVariables({
    schema,
    fieldName: field,
    kind,
    models: models || [],
    ignore,
    depthLimit: depthLimit || Infinity,
    circularReferenceDepth: circularReferenceDepth || 1,
    argNames,
    selectedFields,
    rootTypeNames,
  })

  // attach variables
  ;(operationNode as any).variableDefinitions = [...operationVariables]

  const type = getDefinedRootType(schema, kind)
  const operationField = type.getFields()[field]

  ;(operationNode as any).args = normalizeGraphqlField(operationField)

  resetOperationVariables()
  resetFieldMap()

  return operationNode
}

function buildOperationAndCollectVariables({
  schema,
  fieldName,
  kind,
  models,
  ignore,
  depthLimit,
  circularReferenceDepth,
  argNames,
  selectedFields,
  rootTypeNames,
}: {
  schema: GraphQLSchema
  /** root operation name：eg.search、_schema */
  fieldName: string
  kind: OperationTypeNode
  models: string[]
  ignore: Ignore
  depthLimit: number
  circularReferenceDepth: number
  argNames?: string[]
  selectedFields: SelectedFields
  rootTypeNames: Set<string>
}): OperationDefinitionNodeGroupType {
  /** root Query GraphQLObjectType */
  const type = getDefinedRootType(schema, kind)

  /** eg. search--GraphQLField */
  const field = type.getFields()[fieldName]

  // TODO 注释掉首字母大写
  // const operationName = capitalizeFirstLetter(fieldName)
  const operationName = fieldName

  if (field.args) {
    for (const arg of field.args) {
      const argName = arg.name
      if (!argNames || argNames.includes(argName)) {
        addOperationVariable(resolveVariable(arg, argName))
      }
    }
  }

  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: kind,
    operationDefinitionDescription: field.description,
    name: {
      kind: Kind.NAME,
      value: operationName,
    },
    variableDefinitions: [],
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        resolveField({
          type,
          field,
          models,
          firstCall: true,
          path: [field.name],
          ancestors: [],
          ignore,
          depthLimit,
          circularReferenceDepth,
          schema,
          depth: 0,
          argNames,
          selectedFields,
          rootTypeNames,
        }),
      ],
    },
  } as unknown as OperationDefinitionNodeGroupType
}

function resolveSelectionSet({
  parent,
  type,
  models,
  firstCall,
  path,
  ancestors,
  ignore,
  depthLimit,
  circularReferenceDepth,
  schema,
  depth,
  argNames,
  selectedFields,
  rootTypeNames,
}: {
  parent: GraphQLNamedType
  type: GraphQLNamedType
  models: string[]
  path: string[]
  ancestors: GraphQLNamedType[]
  firstCall?: boolean
  ignore: Ignore
  depthLimit: number
  circularReferenceDepth: number
  schema: GraphQLSchema
  depth: number
  selectedFields: SelectedFields
  argNames?: string[]
  rootTypeNames: Set<string>
}): SelectionSetNode | void {
  const prefix = path.join('')

  if (typeof selectedFields === 'boolean' && depth > depthLimit) {
    return
  }

  if (isUnionType(type)) {
    const types = type.getTypes()

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .filter(
          (t) =>
            !hasCircularRef([...ancestors, t], {
              depth: circularReferenceDepth,
            }),
        )
        .map<InlineFragmentNode>((t) => {
          path.push(t.name)

          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name,
              },
            },
            checked: false,
            fieldKey: prefix + t.name,
            nameValue: t.name,
            description: t.description,
            selectionSet: resolveSelectionSet({
              parent: type,
              type: t,
              models,
              path,
              ancestors,
              ignore,
              depthLimit,
              circularReferenceDepth,
              schema,
              depth,
              argNames,
              selectedFields,
              rootTypeNames,
            }) as SelectionSetNode,
          }
        })
        .filter((fragmentNode) => fragmentNode?.selectionSet?.selections?.length > 0),
    }
  }

  if (isInterfaceType(type)) {
    const types = Object.values(schema.getTypeMap()).filter((t: any) => isObjectType(t) && t.getInterfaces().includes(type)) as GraphQLObjectType[]

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .filter(
          (t) =>
            !hasCircularRef([...ancestors, t], {
              depth: circularReferenceDepth,
            }),
        )
        .map<InlineFragmentNode>((t) => {
          path.push(t.name)

          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name,
              },
            },
            checked: false,
            fieldKey: prefix + t.name,
            nameValue: t.name,
            description: t.description,
            selectionSet: resolveSelectionSet({
              parent: type,
              type: t,
              models,
              path,
              ancestors,
              ignore,
              depthLimit,
              circularReferenceDepth,
              schema,
              depth,
              argNames,
              selectedFields,
              rootTypeNames,
            }) as SelectionSetNode,
          }
        })
        .filter((fragmentNode) => fragmentNode?.selectionSet?.selections?.length > 0),
    }
  }

  if (isObjectType(type) && !rootTypeNames.has(type.name)) {
    const isIgnored = ignore.includes(type.name) || ignore.includes(`${parent.name}.${path[path.length - 1]}`)
    const isModel = models.includes(type.name)

    if (!firstCall && isModel && !isIgnored) {
      return {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            kind: Kind.FIELD,
            name: {
              kind: Kind.NAME,
              value: 'id',
            },
          },
        ],
      }
    }

    // 获取通过继承的interfaces类型
    const _interfaces = type.getInterfaces()
    // 得到继承的所有字段
    const _interfacesFields = _interfaces
      .map((_interfaceItm) => {
        return _interfaceItm.getFields()
      })
      .reduce((pre, cur) => ({ ...pre, ...cur }), {})

    // 得到自身的所有字段
    const fields = type.getFields()
    // 将继承的字段覆盖自身的字段，这样是
    const tmpFields = { ...fields, ..._interfacesFields }

    return {
      kind: Kind.SELECTION_SET,
      selections: Object.keys(tmpFields)
        .filter((fieldName) => {
          return !hasCircularRef([...ancestors, getNamedType(tmpFields[fieldName].type)], {
            depth: circularReferenceDepth,
          })
        })
        .map((fieldName) => {
          const selectedSubFields = typeof selectedFields === 'object' ? selectedFields[fieldName] : true
          if (selectedSubFields) {
            return resolveField({
              type,
              field: tmpFields[fieldName],
              models,
              path: [...path, fieldName],
              ancestors,
              ignore,
              depthLimit,
              circularReferenceDepth,
              schema,
              depth,
              argNames,
              selectedFields: selectedSubFields,
              rootTypeNames,
            })
          }
          return null
        })
        .filter((f): f is SelectionNode => {
          // eslint-disable-next-line eqeqeq
          if (f == null) {
            return false
          } else if ('selectionSet' in f) {
            return !!f.selectionSet?.selections?.length
          }
          return true
        }),
    }
  }
}

function resolveVariable(arg: GraphQLArgument, name?: string): VariableDefinitionNode {
  function resolveVariableType(type: GraphQLList<any>): ListTypeNode
  function resolveVariableType(type: GraphQLNonNull<any>): NonNullTypeNode
  function resolveVariableType(type: GraphQLInputType): TypeNode
  function resolveVariableType(type: GraphQLInputType): TypeNode {
    if (isListType(type)) {
      return {
        kind: Kind.LIST_TYPE,
        type: resolveVariableType(type.ofType),
      }
    }

    if (isNonNullType(type)) {
      return {
        kind: Kind.NON_NULL_TYPE,
        // for v16 compatibility
        type: resolveVariableType(type.ofType) as any,
      }
    }

    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name,
      },
    }
  }

  return {
    kind: Kind.VARIABLE_DEFINITION,
    directives: arg.astNode?.directives,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: name || arg.name,
      },
    },
    type: resolveVariableType(arg.type),
  }
}

function getArgumentName(name: string, path: string[]): string {
  return [...path, name].join('_')
}

function resolveField({
  type,
  field,
  models,
  firstCall,
  path,
  ancestors,
  ignore,
  depthLimit,
  circularReferenceDepth,
  schema,
  depth,
  argNames,
  selectedFields,
  rootTypeNames,
}: {
  type: GraphQLObjectType
  field: GraphQLField<any, any>
  models: string[]
  path: string[]
  ancestors: GraphQLNamedType[]
  firstCall?: boolean
  ignore: Ignore
  depthLimit: number
  circularReferenceDepth: number
  schema: GraphQLSchema
  depth: number
  selectedFields: SelectedFields
  argNames?: string[]
  rootTypeNames: Set<string>
}): SelectionNode {
  let fieldKey = ''
  if (path.length === 1) {
    fieldKey = field.name
  } else {
    fieldKey = path.join('')
  }

  // "field.type"是operation的返回类型
  const namedType = getNamedType(field.type)

  let args: ArgumentNode[] = []
  let removeField = false

  if (field.args && field.args.length) {
    args = field.args
      .map<ArgumentNode>((arg) => {
        const argumentName = getArgumentName(arg.name, path)
        if (argNames && !argNames.includes(argumentName)) {
          if (isNonNullType(arg.type)) {
            removeField = true
          }
          return null as any
        }
        if (!firstCall) {
          addOperationVariable(resolveVariable(arg, argumentName))
        }

        return {
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: arg.name,
          },
          value: {
            kind: Kind.VARIABLE,
            name: {
              kind: Kind.NAME,
              value: getArgumentName(arg.name, path),
            },
          },
        }
      })
      .filter(Boolean)
  }

  if (removeField) {
    return null as any
  }

  const fieldPath = [...path, field.name]

  const fieldPathStr = fieldPath.join('.')
  let fieldName = field.name
  if (fieldTypeMap.has(fieldPathStr) && fieldTypeMap.get(fieldPathStr) !== field.type.toString()) {
    fieldName += (field.type as any).toString().replace('!', 'NonNull').replace('[', 'List').replace(']', '')
  }
  fieldTypeMap.set(fieldPathStr, field.type.toString())

  if (!isScalarType(namedType) && !isEnumType(namedType)) {
    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field.name,
      },
      checked: false,
      fieldKey,
      nameValue: field.name,
      type: getFieldNodeType(field),
      description: field.description,
      directives: field.astNode?.directives,
      ...(fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } }),
      selectionSet:
        resolveSelectionSet({
          parent: type,
          type: namedType,
          models,
          firstCall,
          // 这里源码是有bug的，我已经修复，原来是这样 path: fieldPath，这样就导致path路径有的对象字段会重复出现多一次在path数组里面
          path,
          ancestors: [...ancestors, type],
          ignore,
          depthLimit,
          circularReferenceDepth,
          schema,
          depth: depth + 1,
          argNames,
          selectedFields,
          rootTypeNames,
        }) || undefined,
      arguments: args,
    } as SelectionNode
  }

  if (isEnumType(namedType)) {
    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field.name,
      },
      checked: false,
      fieldKey,
      nameValue: field.name,
      type: getFieldNodeType(field),
      description: field.description,
      enum: (namedType as any)?._values,
      directives: field.astNode?.directives,
      ...(fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } }),
      arguments: args,
    } as SelectionNode
  }

  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    checked: false,
    fieldKey,
    nameValue: field.name,
    type: getFieldNodeType(field),
    description: field.description,
    directives: field.astNode?.directives,
    ...(fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } }),
    arguments: args,
  } as SelectionNode
}

function hasCircularRef(
  types: GraphQLNamedType[],
  config: {
    depth: number
  } = {
    depth: 1,
  },
): boolean {
  const type = types[types.length - 1]

  if (isScalarType(type)) {
    return false
  }

  const size = types.filter((t) => t.name === type.name).length
  return size > config.depth
}
