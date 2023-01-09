import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import { Spin } from "antd"
import React from "react"
import { FC, useState, useEffect } from "react"
// import styles from "./index.module.less"
import DocSidebar from "../components/side-bar/index"

interface IProps {}

const App: FC<IProps> = () => {
  const [operations, setOperations] = useState<TypedOperation[]>([])

  useEffect(() => {
    const vscode = (window as any).acquireVsCodeApi() as any
    vscode.postMessage({ data: true })

    window.addEventListener("message", (evt) => {
      console.log(evt.data)
      setOperations(evt.data)
    })
  }, [])

  return (
    <Spin spinning={!operations.length}>
      <DocSidebar operations={operations} keyword="" onSelect={() => {}} selectedOperationId="1" onKeywordChange={() => {}} />
    </Spin>
  )
}

export default App
