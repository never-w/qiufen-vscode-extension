import React, { useCallback, useMemo, useState } from "react"
import { Spin, message } from "antd"
import { FC, useEffect } from "react"
import DocSidebar from "@/webview/components/side-bar/index"
import useBearStore from "./stores"
import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import Content from "./components/content"

interface IProps {}

const App: FC<IProps> = () => {
  const { operations, captureMessage: handleCaptureMessage, reloadOperations, isDisplaySidebar } = useBearStore((state) => state)
  const [operationData, setOperationData] = useState<TypedOperation | null>(null)
  const [keyword, setKeyword] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [activeItemKey, setActiveItemKey] = useState("")
  const selectedOperationId = !!activeItemKey ? activeItemKey : operations[0]?.operationType + operations[0]?.name

  const onSelect = useCallback((operation: TypedOperation) => {
    setOperationData(operation)
  }, [])

  useMemo(async () => {
    setLoading(true)
    await handleCaptureMessage()
    setLoading(false)
  }, [handleCaptureMessage])

  useEffect(() => {
    const operationResult = operations.find((operationItm) => {
      return operationItm?.operationType + operationItm?.name === selectedOperationId
    })
    setOperationData(operationResult!)
  }, [operations, selectedOperationId])

  const handleReload = async () => {
    let timer: NodeJS.Timeout | undefined
    setLoading(true)
    try {
      await Promise.race([
        reloadOperations(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            message.error("network error")
            return reject(new Error("request timeout"))
          }, 10000)
        }),
      ])
    } catch {}
    clearTimeout(timer)
    setLoading(false)
  }

  return (
    <div>
      <Spin spinning={loading}>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <div style={{ display: isDisplaySidebar ? "block" : "none" }}>
            <DocSidebar
              handleReload={handleReload}
              activeItemKey={activeItemKey}
              setActiveItemKey={setActiveItemKey}
              operations={operations}
              keyword={keyword}
              selectedOperationId={selectedOperationId}
              onSelect={onSelect}
              onKeywordChange={setKeyword}
            />
          </div>
          {/* selectedOperationId必须加上不然会出现不重置组件bug */}
          <Content key={selectedOperationId} operation={operationData!} />
        </div>
      </Spin>
    </div>
  )
}

export default App
