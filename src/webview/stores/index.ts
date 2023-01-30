import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import { Uri } from "vscode"
import create, { SetState } from "zustand"

interface MessageEvent {
  operations: TypedOperation[]
  vscode: any
  IpAddress: string
  isDisplaySidebar: boolean
  port: number
}

interface BearState extends MessageEvent {
  captureMessage: () => Promise<boolean>
  reloadOperations: () => Promise<boolean>
  setState: SetState<BearState>
}

const useBearStore = create<BearState>((set, get) => {
  return {
    port: 2121,
    operations: [],
    IpAddress: "",
    isDisplaySidebar: true,
    vscode: (window as unknown as VscodeGlobal).acquireVsCodeApi(),
    captureMessage() {
      return new Promise((resolve) => {
        const vscode = get().vscode
        // 向插件发送信息
        vscode.postMessage(true)
        // 接受插件发送过来的信息
        window.addEventListener("message", (evt) => {
          const data = evt.data as MessageEvent
          set(data)
          resolve(true)
        })
      })
    },
    setState: set,
    reloadOperations() {
      return new Promise((resolve) => {
        window.addEventListener("message", (evt) => {
          const data = evt.data as MessageEvent
          set(data)
          resolve(true)
        })
      })
    },
  }
})

export default useBearStore