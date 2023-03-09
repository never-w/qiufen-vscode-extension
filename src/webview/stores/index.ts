import { MessageEnum } from "@/config/postMessage"
import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import create, { SetState } from "zustand"

interface MessageEvent {
  operations: TypedOperation[]
  vscode: any
  IpAddress: string
  isDisplaySidebar: boolean
  port: number
  typeDefs: string
  localTypeDefs: string
  directive: string
  workspaceGqlNames: string[]
}

interface BearState extends MessageEvent {
  captureMessage: () => Promise<boolean>
  reloadOperations: () => Promise<boolean>
  setState: SetState<BearState>
}

const useBearStore = create<BearState>((set, get) => {
  return {
    port: 9400,
    directive: "",
    localTypeDefs: "",
    operations: [],
    IpAddress: "",
    typeDefs: "",
    workspaceGqlNames: [],
    isDisplaySidebar: true,
    vscode: (window as unknown as VscodeGlobal).acquireVsCodeApi(),
    captureMessage() {
      return new Promise((resolve) => {
        globalThis.MessageEvent
        const vscode = get().vscode
        // 向插件发送信息
        vscode.postMessage({ type: MessageEnum.FETCH })
        // 接受插件发送过来的信息
        window.addEventListener("message", listener)

        function listener(evt: globalThis.MessageEvent) {
          const data = evt.data as MessageEvent
          set(data)
          resolve(true)
          window.removeEventListener("message", listener)
        }
      })
    },
    setState: set,
    reloadOperations() {
      return new Promise((resolve) => {
        const vscode = get().vscode
        // 向插件发送信息
        vscode.postMessage({
          type: MessageEnum.REFETCH,
        })
        window.addEventListener("message", listener)

        function listener(evt: globalThis.MessageEvent) {
          const data = evt.data as MessageEvent
          set(data)
          resolve(true)
          window.removeEventListener("message", listener)
        }
      })
    },
  }
})

export default useBearStore
