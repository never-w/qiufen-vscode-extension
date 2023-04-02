import { FC } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { Spin, message } from 'antd'
import DocSidebar from './components/side-bar/index'
import useBearStore from './stores'
import Content from './components/content'
import { buildSchema } from 'graphql'
import { getOperationNodesForFieldAstBySchema, OperationNodesForFieldAstBySchemaReturnType } from './utils/operations'

interface IProps {}

const App: FC<IProps> = () => {
  const { captureMessage, reloadOperations, isDisplaySidebar, typeDefs } = useBearStore((state) => state)
  const [keyword, setKeyword] = useState<string>('')
  const [activeItemKey, setActiveItemKey] = useState('')
  const [loading, setLoading] = useState(false)

  useMemo(async () => {
    setLoading(true)
    await captureMessage()
    setLoading(false)
  }, [captureMessage])

  const operationObjList = useMemo(() => {
    let result: OperationNodesForFieldAstBySchemaReturnType = []
    if (typeDefs) {
      const schema = buildSchema(typeDefs)
      result = getOperationNodesForFieldAstBySchema(schema)
    }
    return result
  }, [typeDefs])

  const selectedOperationId = !!activeItemKey ? activeItemKey : operationObjList[0]?.operationDefNodeAst?.operation + operationObjList[0]?.operationDefNodeAst?.name?.value

  const operationObj = useMemo(() => {
    return operationObjList.find((item) => item.operationDefNodeAst.operation + item.operationDefNodeAst.name?.value === selectedOperationId)!
  }, [operationObjList, selectedOperationId])

  const handleReload = useCallback(async () => {
    let timer: NodeJS.Timeout | undefined
    setLoading(true)
    try {
      await Promise.race([
        reloadOperations(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            message.error('network error')
            return reject(new Error('request timeout'))
          }, 10000)
        }),
      ])
    } catch {}
    clearTimeout(timer)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <Spin spinning={!operationObjList.length || loading}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <div style={{ display: isDisplaySidebar ? 'block' : 'none' }}>
            <DocSidebar
              handleReload={handleReload}
              activeItemKey={activeItemKey}
              setActiveItemKey={setActiveItemKey}
              operationsDefNodeObjList={operationObjList}
              keyword={keyword}
              selectedOperationId={selectedOperationId}
              onSelect={() => {}}
              onKeywordChange={setKeyword}
            />
          </div>
          <Content key={selectedOperationId} operationObj={operationObj} />
        </div>
      </Spin>
    </div>
  )
}

export default App
