import React, { memo, useMemo } from 'react'
import OperationDoc from './operation-doc'
import type { FC } from 'react'
import { OperationNodesForFieldAstBySchemaReturnType } from '@/utils/operations'

interface IProps {
  operationObj: OperationNodesForFieldAstBySchemaReturnType[number]
}

const DocContent: FC<IProps> = ({ operationObj }) => {
  const contentJSX = useMemo(() => {
    if (!operationObj) {
      return null
    }

    return <OperationDoc operationObj={operationObj} />
  }, [operationObj])

  return contentJSX
}

export default memo(DocContent)
