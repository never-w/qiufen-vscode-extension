import {
  getOperationNodesForFieldAstBySchema,
  type OperationNodesForFieldAstBySchemaReturnType,
} from '@fruits-chain/qiufen-pro-helpers'
import { buildSchema } from 'graphql'
import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import useBearStore from '@/stores'

import OperationDoc from './components/operation-doc'

import type { FC } from 'react'

interface IProps {}

const DocContent: FC<IProps> = () => {
  const { id } = useParams<'id'>()
  const { typeDefs } = useBearStore(state => state)

  const operationObjList = useMemo(() => {
    let result: OperationNodesForFieldAstBySchemaReturnType[] = []
    if (typeDefs) {
      const schema = buildSchema(typeDefs)
      result = getOperationNodesForFieldAstBySchema(schema)
    }
    return result
  }, [typeDefs])

  const operationObj = useMemo(() => {
    const result = operationObjList.find(
      item =>
        item.operationDefNodeAst.operation +
          item.operationDefNodeAst.name?.value ===
        id,
    )

    return result
  }, [id, operationObjList])

  if (!operationObj?.operationDefNodeAst) {
    return null
  }

  return <OperationDoc operationObj={operationObj} />
}

export default DocContent
