import React, { useMemo } from 'react'
import OperationDoc from './components/operation-doc'
import type { FC } from 'react'
import { OperationNodesForFieldAstBySchemaReturnType, getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import { buildSchema } from 'graphql'
import useBearStore from '@/stores'
import { useParams } from 'react-router-dom'

interface IProps {}

const DocContent: FC<IProps> = () => {
  const { id } = useParams<'id'>()
  const { typeDefs } = useBearStore((state) => state)

  const operationObjList = useMemo(() => {
    let result: OperationNodesForFieldAstBySchemaReturnType = []
    if (typeDefs) {
      const schema = buildSchema(typeDefs)
      result = getOperationNodesForFieldAstBySchema(schema)
    }
    return result
  }, [typeDefs])

  const operationObj = useMemo(() => {
    return operationObjList.find(
      (item) => item.operationDefNodeAst.operation + item.operationDefNodeAst.name?.value === id,
    )!
  }, [id, operationObjList])

  if (!operationObj) {
    return null
  }

  return <OperationDoc operationObj={operationObj} />
}

export default DocContent
