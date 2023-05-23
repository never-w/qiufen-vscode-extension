import { GraphQLField, Kind } from 'graphql'
import { ArgTypeDef } from './interface'
import { ArgColumnRecord } from '@/pages/doc-content/components/args-table'

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

export const getArgsTreeDataTypeList = (args: ArgTypeDef[], keyPrefix = '', variablesTypeList: any[] = []) => {
  const result: ArgColumnRecord[] = args.map(({ type, ...originData }) => {
    const key = `${keyPrefix}${originData.name}`
    let children: ArgColumnRecord['children'] = []

    if (type.kind === 'InputObject') {
      children = getArgsTreeDataTypeList(type.fields, key, variablesTypeList)
    }

    variablesTypeList.push(type.ofName)
    return {
      ...originData,
      key,
      type: type.name,
      children,
    }
  })

  return result
}
