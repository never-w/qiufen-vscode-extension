import React, { memo, useMemo } from 'react'
import OperationDoc from './operation-doc'
import type { FC } from 'react'
import { OperationNodesForFieldAstBySchemaReturnType } from '@/utils-copy/operations'

interface IProps {
  operationObj: OperationNodesForFieldAstBySchemaReturnType[number]
}

const DocContent: FC<IProps> = ({ operationObj }) => {
  console.log(operationObj, '+++')

  const contentJSX = useMemo(() => {
    if (!operationObj) {
      return null
    }

    return <OperationDoc operationObj={operationObj} />
  }, [operationObj])

  return null
}

export default memo(DocContent)
