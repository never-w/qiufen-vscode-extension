import { FC, useEffect } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { Spin, message } from 'antd'
import { buildSchema } from 'graphql'
import useBearStore from '@/stores'
import { OperationNodesForFieldAstBySchemaReturnType, getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import DocSidebar from '@/components/side-bar/index'
import { Outlet, useParams } from 'react-router-dom'

interface IProps {}

const OperationsContent: FC<IProps> = () => {
  const { id } = useParams<'id'>()
  const { captureMessage, reloadOperations, isDisplaySidebar, typeDefs, setState } = useBearStore((state) => state)
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
  }, [reloadOperations])

  useEffect(() => {
    return () => {
      // 这里是为了重置 状态管理的typeDefs的值，这样点击侧边icon切换时不会出现延迟很久的bug
      setState({ typeDefs: '' })
    }
  }, [setState])

  const key = useMemo(() => {
    return operationObjList.length
      ? operationObjList[0]?.operationDefNodeAst?.operation + operationObjList[0]?.operationDefNodeAst?.name?.value
      : ''
  }, [operationObjList])

  return (
    <Spin spinning={!operationObjList.length || loading}>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ display: isDisplaySidebar ? 'block' : 'none' }}>
          <DocSidebar
            handleReload={handleReload}
            activeItemKey={id! || key}
            operationsDefNodeObjList={operationObjList}
            selectedOperationId={id! || key}
          />
        </div>
        <Outlet />
      </div>
    </Spin>
  )
}

export default OperationsContent
