import React, { FC, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { buildSchema, findDangerousChanges } from 'graphql'
import useBearStore from '@/stores'
import { diff, findBreakingChanges } from '@/utils/schemaDiff'
import { OperationNodesForFieldAstBySchemaReturnType, getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import { useNavigate } from 'react-router-dom'

interface IProps {}

const Home: FC<IProps> = () => {
  const navigate = useNavigate()
  const { captureMessage, typeDefs, localTypeDefs } = useBearStore((state) => state)
  const [loading, setLoading] = useState(false)

  useMemo(async () => {
    setLoading(true)
    await captureMessage()
    setLoading(false)
  }, [captureMessage])

  const operationNamedTypeListInfo = useMemo(() => {
    if (typeDefs) {
      const schema = buildSchema(typeDefs)
      const result: OperationNodesForFieldAstBySchemaReturnType = getOperationNodesForFieldAstBySchema(schema)

      return result.map((item) => ({
        operationType: item?.operationDefNodeAst?.operation,
        operationName: item?.operationDefNodeAst?.name?.value,
        namedTypeList: item?.operationDefNodeAst?.namedTypeList,
      }))
    }

    return []
  }, [typeDefs])

  const operationChangeList = useMemo(() => {
    if (typeDefs && localTypeDefs) {
      const [leftSchema, rightSchema] = [buildSchema(localTypeDefs), buildSchema(typeDefs)]
      console.log(findDangerousChanges(leftSchema, rightSchema))

      const changeList = findBreakingChanges(leftSchema, rightSchema)
      return changeList
    }

    return []
  }, [localTypeDefs, typeDefs])

  console.log(operationChangeList, '       changes')

  const routerPath = useMemo(() => {
    let res = ''

    // if (typeDefs && localTypeDefs) {
    //   const [leftSchema, rightSchema] = [buildSchema(localTypeDefs), buildSchema(typeDefs)]
    //   const type = findBreakingChanges(leftSchema, rightSchema)[1]?.type

    //   const filterOperation = operationNamedTypeListInfo?.filter((item) => {
    //     const tmpNamedTypeList = item?.namedTypeList?.map((item) => (item as any)?.name) as string[]
    //     return tmpNamedTypeList.includes(type?.name || '')
    //   })[0]

    //   return (res = filterOperation?.operationType + filterOperation?.operationName)
    // }

    return res
  }, [localTypeDefs, operationNamedTypeListInfo, typeDefs])

  return (
    <Spin spinning={loading || !typeDefs || !localTypeDefs} style={{ width: '100%', height: 'calc(100vh - 48px)' }}>
      <button
        onClick={() => {
          navigate(`/docs/${routerPath}`)
        }}
      >
        navigate to the operation
      </button>
    </Spin>
  )
}

export default Home
