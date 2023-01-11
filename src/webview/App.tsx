import React, { useCallback, useState } from "react"
import { Button, Spin } from "antd"
import { FC, useEffect } from "react"
import DocSidebar from "@/webview/components/side-bar/index"
import useBearStore from "./stores"
import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import Content from "./components/content"

interface IProps {}

const App: FC<IProps> = () => {
  const { operations, captureMessage: handleCaptureMessage, vscode, setOperations, set } = useBearStore((state) => state)
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

  const [loading, setLoading] = useState(false)

  return (
    <>
      <Button
        onClick={async () => {
          setLoading(true)
          vscode.postMessage(false)
          const res = await setOperations()
          set(res)
          setLoading(false)
        }}
      >
        reload
      </Button>
      <Spin spinning={loading || !operations.length}>
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
    </>
  )
}

export default App
