import { DefinitionNode } from 'graphql'
import create, { SetState } from 'zustand'

export enum MessageEnum {
  FETCH = 'FETCH',
  REFETCH = 'REFETCH',
  ONE_KEY_FILL = 'ONE_KEY_FILL',
}

export const fillOneKeyMessageSignSuccess = 'fill-success'
export const fillOneKeyMessageSignNull = 'fill-null'

export type WorkspaceGqlFileInfoType = {
  filename: string
  operationsAsts: DefinitionNode[]
  operationNames: string[]
  content: string
}
interface MessageEvent {
  isAllAddComment: boolean
  IpAddress: string
  isDisplaySidebar: boolean
  port: number
  typeDefs: string
  localTypeDefs: string
  directive: string
  maxDepth: number
  workspaceGqlNames: string[]
  workspaceGqlFileInfo: WorkspaceGqlFileInfoType[]
}

interface BearState extends MessageEvent {
  fetchRemoteTypeDefs: () => Promise<{
    typeDefs: string
    localTypeDefs: string
  }>
  captureMessage: () => Promise<boolean>
  reloadOperations: () => Promise<boolean>
  setState: SetState<BearState>
}

const useBearStore = create<BearState>((set) => {
  return {
    port: 9400,
    maxDepth: 2,
    directive: '',
    localTypeDefs: '',
    operations: [],
    IpAddress: '',
    typeDefs: '',
    isAllAddComment: false,
    workspaceGqlNames: [],
    workspaceGqlFileInfo: [],
    isDisplaySidebar: true,
    fetchRemoteTypeDefs() {
      return new Promise((resolve) => {
        fetch(`http://localhost:9400/operations`)
          .then((response) => response.json())
          .then((data) => {
            resolve({ typeDefs: data.typeDefs, localTypeDefs: data.localTypeDefs })
          })
      })
    },
    captureMessage() {
      return new Promise((resolve) => {
        fetch(`http://localhost:9400/operations`)
          .then((response) => response.json())
          .then((data) => {
            set(data)
            resolve(true)
          })
      })
    },
    setState: set,
    reloadOperations() {
      return new Promise((resolve) => {
        fetch(`http://localhost:9400/operations`)
          .then((response) => response.json())
          .then((data) => {
            set(data)
            resolve(true)
          })
      })
    },
  }
})

export default useBearStore
