import { fetchUrl } from '@/config'
import { TypedOperation } from '@fruits-chain/qiufen-helpers'
import create, { SetState } from 'zustand'

interface MessageEvent {
  operations: TypedOperation[]
  isDisplaySidebar: boolean
  backendTypeDefs: string
  directive: string
}

interface BearState extends MessageEvent {
  fetchOperations: () => Promise<boolean>
  reloadOperations: () => Promise<boolean>
  setState: SetState<BearState>
}

const useBearStore = create<BearState>((set) => {
  return {
    operations: [],
    directive: 'fetchField',
    isDisplaySidebar: true,
    backendTypeDefs: '',
    fetchOperations() {
      return new Promise((resolve) => {
        fetch(`/operations`)
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
        fetch(`/operations`)
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
