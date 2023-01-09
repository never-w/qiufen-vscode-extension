import React from "react"
import { Spin } from "antd"
import { FC, useEffect } from "react"
import DocSidebar from "@/webview/components/side-bar/index"
import useBearStore from "./stores"

interface IProps {}

const App: FC<IProps> = () => {
  const operations = useBearStore((state) => state.operations)
  const handleCaptureMessage = useBearStore((state) => state.captureMessage)

  useEffect(() => {
    handleCaptureMessage()
  }, [])

  return (
    <Spin spinning={!operations.length}>
      <DocSidebar operations={operations} keyword="" onSelect={() => {}} selectedOperationId="1" onKeywordChange={() => {}} />
    </Spin>
  )
}

export default App
