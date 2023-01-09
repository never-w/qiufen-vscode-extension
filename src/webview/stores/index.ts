import { TypedOperation } from "@fruits-chain/qiufen-helpers"
import { Uri } from "vscode"
import create from "zustand"

interface MessageEvent {
  operations: TypedOperation[]
  vscode: any
  topBackUri: Uri
  collapseAllUri: Uri
}

interface BearState extends MessageEvent {
  collapseAllUri: Uri
  captureMessage: () => void
}

const useBearStore = create<BearState>((set, get) => {
  return {
    operations: [],
    topBackUri: {} as Uri,
    collapseAllUri: {} as Uri,
    vscode: (window as unknown as VscodeGlobal).acquireVsCodeApi(),
    captureMessage() {
      const vscode = get().vscode
      // 向插件发送信息
      vscode.postMessage(true)
      // 接受插件发送过来的信息
      window.addEventListener("message", (evt) => {
        const data = evt.data as MessageEvent
        set({ operations: data.operations })
        set({ topBackUri: data.topBackUri })
        set({ collapseAllUri: data.collapseAllUri })
      })
    },
  }
})

export default useBearStore
