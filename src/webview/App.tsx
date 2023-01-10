import React, { useCallback, useState } from "react"
import { Spin } from "antd"
import { FC, useEffect } from "react"
import DocSidebar from "@/webview/components/side-bar/index"
import useBearStore from "./stores"
import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import Content from "./components/content"

interface IProps {}

const App: FC<IProps> = () => {
  const operations = useBearStore((state) => state.operations)
  const handleCaptureMessage = useBearStore((state) => state.captureMessage)
  const [operationData, setOperationData] = useState<TypedOperation | null>(null)
  const [keyword, setKeyword] = useState<string>("")

  const onSelect = useCallback((operation: TypedOperation) => {
    setOperationData(operation)
  }, [])

  useEffect(() => {
    handleCaptureMessage()
  }, [])

  useEffect(() => {
    setOperationData(operations[0])
  }, [operations])

  return (
    <Spin spinning={!operations.length}>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <DocSidebar
          operations={operations}
          keyword={keyword}
          selectedOperationId={operations[0]?.operationType + operations[0]?.name}
          onSelect={onSelect}
          onKeywordChange={setKeyword}
        />
        <Content key={operations[0]?.operationType + operations[0]?.name} operation={operationData!} />
      </div>
    </Spin>
  )
}

export default App
