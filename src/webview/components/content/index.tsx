import React, { memo, useMemo } from "react"
import OperationDoc from "./operation-doc"
import type { TypedOperation } from "@fruits-chain/qiufen-helpers"
import type { FC } from "react"

interface IProps {
  operation?: TypedOperation
}

const DocContent: FC<IProps> = ({ operation }) => {
  const contentJSX = useMemo(() => {
    if (!operation) {
      return null
    }

    return (
      <OperationDoc
        // TODO 这里给个时间戳key是为了reload operations时树结构表单组件重新渲染
        key={Date.now()}
        operation={operation}
      />
    )
  }, [operation])

  return contentJSX
}

export default memo(DocContent)
