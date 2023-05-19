import { GraphQLField, GraphQLInputField, GraphQLInputType, Kind, isNonNullType, isScalarType } from 'graphql'

function dfs(filedType: any): string {
  if (filedType.kind === Kind.LIST_TYPE) {
    return `[${dfs(filedType?.type)}]`
  }

  if (filedType.kind === Kind.NON_NULL_TYPE) {
    return `${dfs(filedType?.type)}!`
  }

  return filedType?.name?.value
}

export function getFieldNodeType(field: GraphQLField<any, any, any>) {
  const filedType = field?.astNode?.type as any

  if (filedType.kind === Kind.LIST_TYPE) {
    return `[${dfs(filedType?.type)}]`
  }

  if (filedType.kind === Kind.NON_NULL_TYPE) {
    return `${dfs(filedType?.type)}!`
  }

  return filedType?.name?.value
}

function argDfs(filedType: any): string {
  if (filedType.kind === Kind.LIST_TYPE) {
    console.log('ssssssssssss1sssssssss')

    return argDfs(filedType?.type)
  }

  if (filedType.kind === Kind.NON_NULL_TYPE) {
    return argDfs(filedType?.type)
  }

  if (filedType.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
    return argDfs(filedType?.type)
  }

  return filedType?.name?.value
}

export function getArgFieldNodeType(field: GraphQLInputField) {
  const filedType = field?.astNode?.type as any

  if (filedType.kind === Kind.LIST_TYPE) {
    return argDfs(filedType?.type)
  }

  if (filedType.kind === Kind.NON_NULL_TYPE) {
    return argDfs(filedType?.type)
  }

  return filedType?.name?.value
}

function dfsInputType(inputType: GraphQLInputType, result: GraphQLInputField[] = []) {
  if (isScalarType(inputType)) {
    result.push((inputField.type as any)?.name)
  }

  if (isNonNullType(inputType)) {
    dfsInputType(inputType)
  }

  return result
}

export function getInputFieldDfs(inputFields: GraphQLInputField[], result: GraphQLInputField[] = []) {
  inputFields.forEach((inputField) => {
    const inputFieldType = inputField.type

    if (isNonNullType(inputFieldType)) {
      dfsInputType(inputField.type)
    }

    if (isScalarType(inputFieldType)) {
      result.push((inputField.type as any)?.name)
    }
  })

  console.log(result, ' [[[[[[[[[[[[[[]]]]]]]]]]]]]]]')
}
