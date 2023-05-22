import {
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  Kind,
  ObjectFieldNode,
  ValueNode,
  astFromValue,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNamedType,
  isNonNullType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  isSpecifiedScalarType,
  isUnionType,
  print,
} from 'graphql'
import { inspect } from '@graphql-tools/utils'
import { ObjMap } from 'graphql/jsutils/ObjMap'

const DIGIT_0 = 48
const DIGIT_9 = 57

enum OperationOfType {
  'Query' = 'Query',
  'Mutation' = 'Mutation',
}

function naturalCompare(aStr: string, bStr: string): number {
  let aIndex = 0
  let bIndex = 0

  while (aIndex < aStr.length && bIndex < bStr.length) {
    let aChar = aStr.charCodeAt(aIndex)
    let bChar = bStr.charCodeAt(bIndex)

    if (isDigit(aChar) && isDigit(bChar)) {
      let aNum = 0
      do {
        ++aIndex
        aNum = aNum * 10 + aChar - DIGIT_0
        aChar = aStr.charCodeAt(aIndex)
      } while (isDigit(aChar) && aNum > 0)

      let bNum = 0
      do {
        ++bIndex
        bNum = bNum * 10 + bChar - DIGIT_0
        bChar = bStr.charCodeAt(bIndex)
      } while (isDigit(bChar) && bNum > 0)

      if (aNum < bNum) {
        return -1
      }

      if (aNum > bNum) {
        return 1
      }
    } else {
      if (aChar < bChar) {
        return -1
      }
      if (aChar > bChar) {
        return 1
      }
      ++aIndex
      ++bIndex
    }
  }

  return aStr.length - bStr.length
}

function isDigit(code: number): boolean {
  return !isNaN(code) && DIGIT_0 <= code && code <= DIGIT_9
}

function invariant(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message != null ? message : 'Unexpected invariant triggered.')
  }
}

function keyMap<T>(list: ReadonlyArray<T>, keyFn: (item: T) => string): ObjMap<T> {
  const result = Object.create(null)
  for (const item of list) {
    result[keyFn(item)] = item
  }
  return result
}

function sortValueNode(valueNode: ValueNode): ValueNode {
  switch (valueNode.kind) {
    case Kind.OBJECT:
      return {
        ...valueNode,
        fields: sortFields(valueNode.fields),
      }
    case Kind.LIST:
      return {
        ...valueNode,
        values: valueNode.values.map(sortValueNode),
      }
    case Kind.INT:
    case Kind.FLOAT:
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.NULL:
    case Kind.ENUM:
    case Kind.VARIABLE:
      return valueNode
  }
}

function sortFields(fields: ReadonlyArray<ObjectFieldNode>): Array<ObjectFieldNode> {
  return fields
    .map((fieldNode) => ({
      ...fieldNode,
      value: sortValueNode(fieldNode.value),
    }))
    .sort((fieldA, fieldB) => naturalCompare(fieldA.name.value, fieldB.name.value))
}

export enum BreakingChangeType {
  TYPE_REMOVED = 'TYPE_REMOVED',
  TYPE_CHANGED_KIND = 'TYPE_CHANGED_KIND',
  TYPE_REMOVED_FROM_UNION = 'TYPE_REMOVED_FROM_UNION',
  VALUE_REMOVED_FROM_ENUM = 'VALUE_REMOVED_FROM_ENUM',
  REQUIRED_INPUT_FIELD_ADDED = 'REQUIRED_INPUT_FIELD_ADDED',
  IMPLEMENTED_INTERFACE_REMOVED = 'IMPLEMENTED_INTERFACE_REMOVED',
  FIELD_ADDED = 'FIELD_ADDED',
  FIELD_REMOVED = 'FIELD_REMOVED',
  FIELD_CHANGED_KIND = 'FIELD_CHANGED_KIND',
  REQUIRED_ARG_ADDED = 'REQUIRED_ARG_ADDED',
  ARG_REMOVED = 'ARG_REMOVED',
  ARG_CHANGED_KIND = 'ARG_CHANGED_KIND',
  DIRECTIVE_REMOVED = 'DIRECTIVE_REMOVED',
  DIRECTIVE_ARG_REMOVED = 'DIRECTIVE_ARG_REMOVED',
  REQUIRED_DIRECTIVE_ARG_ADDED = 'REQUIRED_DIRECTIVE_ARG_ADDED',
  DIRECTIVE_REPEATABLE_REMOVED = 'DIRECTIVE_REPEATABLE_REMOVED',
  DIRECTIVE_LOCATION_REMOVED = 'DIRECTIVE_LOCATION_REMOVED',
}

export enum DangerousChangeType {
  VALUE_ADDED_TO_ENUM = 'VALUE_ADDED_TO_ENUM',
  TYPE_ADDED_TO_UNION = 'TYPE_ADDED_TO_UNION',
  OPTIONAL_INPUT_FIELD_ADDED = 'OPTIONAL_INPUT_FIELD_ADDED',
  OPTIONAL_ARG_ADDED = 'OPTIONAL_ARG_ADDED',
  IMPLEMENTED_INTERFACE_ADDED = 'IMPLEMENTED_INTERFACE_ADDED',
  ARG_DEFAULT_VALUE_CHANGE = 'ARG_DEFAULT_VALUE_CHANGE',
}

export interface BreakingChange {
  type: BreakingChangeType
  description: string
  routePath?: string
  typeName?: string
}

export interface DangerousChange {
  type: DangerousChangeType
  description: string
}

/**
 * Given two schemas, returns an Array containing descriptions of all the types
 * of breaking changes covered by the other functions down below.
 */
export function findBreakingChanges(oldSchema: GraphQLSchema, newSchema: GraphQLSchema): Array<BreakingChange> {
  // @ts-expect-error
  return findSchemaChanges(oldSchema, newSchema).filter((change) => change.type in BreakingChangeType)
}

/**
 * Given two schemas, returns an Array containing descriptions of all the types
 * of potentially dangerous changes covered by the other functions down below.
 */
export function findDangerousChanges(oldSchema: GraphQLSchema, newSchema: GraphQLSchema): Array<DangerousChange> {
  // @ts-expect-error
  return findSchemaChanges(oldSchema, newSchema).filter((change) => change.type in DangerousChangeType)
}

function findSchemaChanges(
  oldSchema: GraphQLSchema,
  newSchema: GraphQLSchema,
): Array<BreakingChange | DangerousChange> {
  // 指令变化暂时不关注
  return [...findTypeChanges(oldSchema, newSchema)]
}

function findTypeChanges(oldSchema: GraphQLSchema, newSchema: GraphQLSchema): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []

  const typesDiff = diff(Object.values(oldSchema.getTypeMap()), Object.values(newSchema.getTypeMap()))

  for (const oldType of typesDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.TYPE_REMOVED,
      description: isSpecifiedScalarType(oldType)
        ? `Standard scalar ${oldType.name} was removed because it is not referenced anymore.`
        : `${oldType.name} was removed.`,
      typeName: oldType?.name,
    })
  }

  for (const [oldType, newType] of typesDiff.persisted) {
    if (isEnumType(oldType) && isEnumType(newType)) {
      schemaChanges.push(...findEnumTypeChanges(oldType, newType))
    } else if (isUnionType(oldType) && isUnionType(newType)) {
      schemaChanges.push(...findUnionTypeChanges(oldType, newType))
    } else if (isInputObjectType(oldType) && isInputObjectType(newType)) {
      schemaChanges.push(...findInputObjectTypeChanges(oldType, newType))
    } else if (isObjectType(oldType) && isObjectType(newType)) {
      schemaChanges.push(...findFieldChanges(oldType, newType), ...findImplementedInterfacesChanges(oldType, newType))
    } else if (isInterfaceType(oldType) && isInterfaceType(newType)) {
      schemaChanges.push(...findFieldChanges(oldType, newType), ...findImplementedInterfacesChanges(oldType, newType))
    } else if (oldType.constructor !== newType.constructor) {
      schemaChanges.push({
        type: BreakingChangeType.TYPE_CHANGED_KIND,
        description: `${oldType.name} changed from ` + `${typeKindName(oldType)} to ${typeKindName(newType)}.`,
        typeName: oldType?.name,
      })
    }
  }

  return schemaChanges
}

function findInputObjectTypeChanges(
  oldType: GraphQLInputObjectType,
  newType: GraphQLInputObjectType,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const fieldsDiff = diff(Object.values(oldType.getFields()), Object.values(newType.getFields()))

  for (const newField of fieldsDiff.added) {
    if (isRequiredInputField(newField)) {
      schemaChanges.push({
        type: BreakingChangeType.REQUIRED_INPUT_FIELD_ADDED,
        description: `A required field ${newField.name} on input type ${oldType.name} was added.`,
        typeName: oldType?.name,
      })
    } else {
      schemaChanges.push({
        type: DangerousChangeType.OPTIONAL_INPUT_FIELD_ADDED,
        description: `An optional field ${newField.name} on input type ${oldType.name} was added.`,
        typeName: oldType?.name,
      })
    }
  }

  for (const oldField of fieldsDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.FIELD_REMOVED,
      description: `${oldType.name}.${oldField.name} was removed.`,
      typeName: oldType?.name,
      routePath:
        oldType?.name === OperationOfType.Query
          ? 'query' + oldField.name
          : oldType?.name === OperationOfType.Mutation
          ? 'mutation' + oldField.name
          : '',
    })
  }

  for (const [oldField, newField] of fieldsDiff.persisted) {
    const isSafe = isChangeSafeForInputObjectFieldOrFieldArg(oldField.type, newField.type)
    if (!isSafe) {
      schemaChanges.push({
        type: BreakingChangeType.FIELD_CHANGED_KIND,
        description:
          `${oldType.name}.${oldField.name} changed type from ` +
          `${String(oldField.type)} to ${String(newField.type)}.`,
        typeName: oldType?.name,
        routePath:
          oldType?.name === OperationOfType.Query
            ? 'query' + oldField.name
            : oldType?.name === OperationOfType.Mutation
            ? 'mutation' + oldField.name
            : '',
      })
    }
  }

  return schemaChanges
}

function findUnionTypeChanges(
  oldType: GraphQLUnionType,
  newType: GraphQLUnionType,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const possibleTypesDiff = diff(oldType.getTypes(), newType.getTypes())

  for (const newPossibleType of possibleTypesDiff.added) {
    schemaChanges.push({
      type: DangerousChangeType.TYPE_ADDED_TO_UNION,
      description: `${newPossibleType.name} was added to union type ${oldType.name}.`,
      typeName: oldType?.name,
    })
  }

  for (const oldPossibleType of possibleTypesDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.TYPE_REMOVED_FROM_UNION,
      description: `${oldPossibleType.name} was removed from union type ${oldType.name}.`,
      typeName: oldType?.name,
    })
  }

  return schemaChanges
}

function findEnumTypeChanges(
  oldType: GraphQLEnumType,
  newType: GraphQLEnumType,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const valuesDiff = diff(oldType.getValues(), newType.getValues())

  for (const newValue of valuesDiff.added) {
    schemaChanges.push({
      type: DangerousChangeType.VALUE_ADDED_TO_ENUM,
      description: `${newValue.name} was added to enum type ${oldType.name}.`,
      typeName: oldType?.name,
    })
  }

  for (const oldValue of valuesDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.VALUE_REMOVED_FROM_ENUM,
      description: `${oldValue.name} was removed from enum type ${oldType.name}.`,
      typeName: oldType?.name,
    })
  }

  return schemaChanges
}

function findImplementedInterfacesChanges(
  oldType: GraphQLObjectType | GraphQLInterfaceType,
  newType: GraphQLObjectType | GraphQLInterfaceType,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const interfacesDiff = diff(oldType.getInterfaces(), newType.getInterfaces())

  for (const newInterface of interfacesDiff.added) {
    schemaChanges.push({
      type: DangerousChangeType.IMPLEMENTED_INTERFACE_ADDED,
      description: `${newInterface.name} added to interfaces implemented by ${oldType.name}.`,
      typeName: oldType?.name,
    })
  }

  for (const oldInterface of interfacesDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.IMPLEMENTED_INTERFACE_REMOVED,
      description: `${oldType.name} no longer implements interface ${oldInterface.name}.`,
      typeName: oldType?.name,
    })
  }

  return schemaChanges
}

function findFieldChanges(
  oldType: GraphQLObjectType | GraphQLInterfaceType,
  newType: GraphQLObjectType | GraphQLInterfaceType,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const fieldsDiff = diff(Object.values(oldType.getFields()), Object.values(newType.getFields()))

  for (const oldField of fieldsDiff.added) {
    schemaChanges.push({
      type: BreakingChangeType.FIELD_ADDED,
      description: `${oldType.name}.${oldField.name} was added.`,
      typeName: oldType?.name,
      routePath:
        oldType?.name === OperationOfType.Query
          ? 'query' + oldField.name
          : oldType?.name === OperationOfType.Mutation
          ? 'mutation' + oldField.name
          : '',
    })
  }

  for (const oldField of fieldsDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.FIELD_REMOVED,
      description: `${oldType.name}.${oldField.name} was removed.`,
      typeName: oldType?.name,
      routePath:
        oldType?.name === OperationOfType.Query
          ? 'query' + oldField.name
          : oldType?.name === OperationOfType.Mutation
          ? 'mutation' + oldField.name
          : '',
    })
  }

  for (const [oldField, newField] of fieldsDiff.persisted) {
    schemaChanges.push(...findArgChanges(oldType, oldField, newField))

    const isSafe = isChangeSafeForObjectOrInterfaceField(oldField.type, newField.type)
    if (!isSafe) {
      schemaChanges.push({
        type: BreakingChangeType.FIELD_CHANGED_KIND,
        description:
          `${oldType.name}.${oldField.name} changed type from ` +
          `${String(oldField.type)} to ${String(newField.type)}.`,
        typeName: oldType?.name,
        routePath:
          oldType?.name === OperationOfType.Query
            ? 'query' + oldField.name
            : oldType?.name === OperationOfType.Mutation
            ? 'mutation' + oldField.name
            : '',
      })
    }
  }

  return schemaChanges
}

function findArgChanges(
  oldType: GraphQLObjectType | GraphQLInterfaceType,
  oldField: GraphQLField<unknown, unknown>,
  newField: GraphQLField<unknown, unknown>,
): Array<BreakingChange | DangerousChange> {
  const schemaChanges = []
  const argsDiff = diff(oldField.args, newField.args)

  for (const oldArg of argsDiff.removed) {
    schemaChanges.push({
      type: BreakingChangeType.ARG_REMOVED,
      description: `${oldType.name}.${oldField.name} arg ${oldArg.name} was removed.`,
      typeName: oldType?.name,
    })
  }

  for (const [oldArg, newArg] of argsDiff.persisted) {
    const isSafe = isChangeSafeForInputObjectFieldOrFieldArg(oldArg.type, newArg.type)
    if (!isSafe) {
      schemaChanges.push({
        type: BreakingChangeType.ARG_CHANGED_KIND,
        description:
          `${oldType.name}.${oldField.name} arg ${oldArg.name} has changed type from ` +
          `${String(oldArg.type)} to ${String(newArg.type)}.`,
        typeName: oldType?.name,
        routePath:
          oldType?.name === OperationOfType.Query
            ? 'query' + oldField.name
            : oldType?.name === OperationOfType.Mutation
            ? 'mutation' + oldField.name
            : '',
      })
    } else if (oldArg.defaultValue !== undefined) {
      if (newArg.defaultValue === undefined) {
        schemaChanges.push({
          type: DangerousChangeType.ARG_DEFAULT_VALUE_CHANGE,
          description: `${oldType.name}.${oldField.name} arg ${oldArg.name} defaultValue was removed.`,
          typeName: oldType?.name,
        })
      } else {
        // Since we looking only for client's observable changes we should
        // compare default values in the same representation as they are
        // represented inside introspection.
        const oldValueStr = stringifyValue(oldArg.defaultValue, oldArg.type)
        const newValueStr = stringifyValue(newArg.defaultValue, newArg.type)

        if (oldValueStr !== newValueStr) {
          schemaChanges.push({
            type: DangerousChangeType.ARG_DEFAULT_VALUE_CHANGE,
            description: `${oldType.name}.${oldField.name} arg ${oldArg.name} has changed defaultValue from ${oldValueStr} to ${newValueStr}.`,
            typeName: oldType?.name,
          })
        }
      }
    }
  }

  for (const newArg of argsDiff.added) {
    if (isRequiredArgument(newArg)) {
      schemaChanges.push({
        type: BreakingChangeType.REQUIRED_ARG_ADDED,
        description: `A required arg ${newArg.name} on ${oldType.name}.${oldField.name} was added.`,
      })
    } else {
      schemaChanges.push({
        type: DangerousChangeType.OPTIONAL_ARG_ADDED,
        description: `An optional arg ${newArg.name} on ${oldType.name}.${oldField.name} was added.`,
      })
    }
  }

  return schemaChanges
}

function isChangeSafeForObjectOrInterfaceField(oldType: GraphQLType, newType: GraphQLType): boolean {
  if (isListType(oldType)) {
    return (
      // if they're both lists, make sure the underlying types are compatible
      (isListType(newType) && isChangeSafeForObjectOrInterfaceField(oldType.ofType, newType.ofType)) ||
      // moving from nullable to non-null of the same underlying type is safe
      (isNonNullType(newType) && isChangeSafeForObjectOrInterfaceField(oldType, newType.ofType))
    )
  }

  if (isNonNullType(oldType)) {
    // if they're both non-null, make sure the underlying types are compatible
    return isNonNullType(newType) && isChangeSafeForObjectOrInterfaceField(oldType.ofType, newType.ofType)
  }

  return (
    // if they're both named types, see if their names are equivalent
    (isNamedType(newType) && oldType.name === newType.name) ||
    // moving from nullable to non-null of the same underlying type is safe
    (isNonNullType(newType) && isChangeSafeForObjectOrInterfaceField(oldType, newType.ofType))
  )
}

function isChangeSafeForInputObjectFieldOrFieldArg(oldType: GraphQLType, newType: GraphQLType): boolean {
  if (isListType(oldType)) {
    // if they're both lists, make sure the underlying types are compatible
    return isListType(newType) && isChangeSafeForInputObjectFieldOrFieldArg(oldType.ofType, newType.ofType)
  }

  if (isNonNullType(oldType)) {
    return (
      // if they're both non-null, make sure the underlying types are
      // compatible
      (isNonNullType(newType) && isChangeSafeForInputObjectFieldOrFieldArg(oldType.ofType, newType.ofType)) ||
      // moving from non-null to nullable of the same underlying type is safe
      (!isNonNullType(newType) && isChangeSafeForInputObjectFieldOrFieldArg(oldType.ofType, newType))
    )
  }

  // if they're both named types, see if their names are equivalent
  return isNamedType(newType) && oldType.name === newType.name
}

function typeKindName(type: GraphQLNamedType): string {
  if (isScalarType(type)) {
    return 'a Scalar type'
  }
  if (isObjectType(type)) {
    return 'an Object type'
  }
  if (isInterfaceType(type)) {
    return 'an Interface type'
  }
  if (isUnionType(type)) {
    return 'a Union type'
  }
  if (isEnumType(type)) {
    return 'an Enum type'
  }
  if (isInputObjectType(type)) {
    return 'an Input type'
  }
  /* c8 ignore next 3 */
  // Not reachable, all possible types have been considered.
  invariant(false, 'Unexpected type: ' + inspect(type))
}

function stringifyValue(value: unknown, type: GraphQLInputType): string {
  const ast = astFromValue(value, type)
  invariant(ast != null)
  return print(sortValueNode(ast))
}

function diff<T extends { name: string }>(
  oldArray: ReadonlyArray<T>,
  newArray: ReadonlyArray<T>,
): {
  added: ReadonlyArray<T>
  removed: ReadonlyArray<T>
  persisted: ReadonlyArray<[T, T]>
} {
  const added: Array<T> = []
  const removed: Array<T> = []
  const persisted: Array<[T, T]> = []

  const oldMap = keyMap(oldArray, ({ name }) => name)
  const newMap = keyMap(newArray, ({ name }) => name)

  for (const oldItem of oldArray) {
    const newItem = newMap[oldItem.name]
    if (newItem === undefined) {
      removed.push(oldItem)
    } else {
      persisted.push([oldItem, newItem])
    }
  }

  for (const newItem of newArray) {
    if (oldMap[newItem.name] === undefined) {
      added.push(newItem)
    }
  }

  return { added, persisted, removed }
}
