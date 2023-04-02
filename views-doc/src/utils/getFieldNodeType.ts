import { GraphQLField, Kind } from 'graphql'

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
