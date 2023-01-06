import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import React from "react"
import { FC, useState, useEffect } from "react"
import "./App.css"

interface IProps {}

const App: FC<IProps> = (props) => {
  const [operations, setOperations] = useState<TypedOperation[]>([])

  useEffect(() => {
    // const vscode = (window as any).acquireVsCodeApi() as any
    // vscode.postMessage({ data: "loaded" })

    window.addEventListener("message", (evt) => {
      console.log(evt.data)
      setOperations(evt.data)
    })
  }, [])

  return (
    <div className="main">
      {operations?.map((item, index) => {
        return (
          <div key={index}>
            <div>{item.name + "1111111111111"}</div>
          </div>
        )
      })}
    </div>
  )
}

export default App
