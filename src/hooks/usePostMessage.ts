import { MessageEnum } from '@/config/postMessage'
import { DefinitionNode } from 'graphql'
import { useCallback, useEffect, useState } from 'react'

type WorkspaceGqlFileInfoType = {
  filename: string
  operationsAsts: DefinitionNode[]
  operationNames: string[]
  content: string
}

interface MessageData {
  vscode: any
  IpAddress: string
  isDisplaySidebar: boolean
  port: number
  typeDefs: string
  localTypeDefs: string
  directive: string
  workspaceGqlNames: string[]
  workspaceGqlFileInfo: WorkspaceGqlFileInfoType[]
}

const vscode = (window as any).acquireVsCodeApi() as any
export function usePostMessage() {
  const [data, setData] = useState<MessageData>({
    port: 9400,
    directive: '',
    localTypeDefs: '',
    IpAddress: '',
    typeDefs: '',
    workspaceGqlNames: [],
    workspaceGqlFileInfo: [],
    isDisplaySidebar: true,
    vscode,
  })

  const reload = useCallback<() => Promise<boolean>>(() => {
    return new Promise((resolve, reject) => {
      // 向插件发送信息
      vscode.postMessage({
        type: MessageEnum.REFETCH,
      })
      try {
        window.addEventListener('message', listener)
      } catch {
        reject(false)
      }

      function listener(evt: any) {
        const data = evt.data as MessageData
        setData(data)
        resolve(true)
        window.removeEventListener('message', listener)
      }
    })
  }, [])

  useEffect(() => {
    // 向插件发送信息
    vscode.postMessage({ type: MessageEnum.FETCH })
    // 接受插件发送过来的信息
    window.addEventListener('message', listener)

    function listener(evt: any) {
      const data = evt.data as MessageData
      setData(data)
      window.removeEventListener('message', listener)
    }
  }, [])

  return {
    ...data,
    reload,
  }
}
