import { fetchUrl } from '@/config'
import { TypedOperation } from '@fruits-chain/qiufen-helpers'
import create, { SetState } from 'zustand'

interface MessageEvent {
  operations: TypedOperation[]
  isDisplaySidebar: boolean
  port: number
}

interface BearState extends MessageEvent {
  fetchOperations: () => Promise<boolean>
  reloadOperations: () => Promise<boolean>
  setState: SetState<BearState>
}

const useBearStore = create<BearState>((set) => {
  return {
    port: 9400,
    operations: [],
    isDisplaySidebar: true,
    fetchOperations() {
      return new Promise((resolve) => {
        fetch(`${fetchUrl}/operations`)
          .then((response) => response.json())
          .then((data) => {
            set({
              operations: data,
            })
            resolve(true)
          })
      })
    },
    setState: set,
    reloadOperations() {
      return new Promise((resolve) => {
        fetch(`${fetchUrl}/operations`)
          .then((response) => response.json())
          .then((data) => {
            set({ operations: data })
            resolve(true)
          })
      })
    },
  }
})

export default useBearStore
