import React, { FC, useMemo, useState } from 'react'
import { Spin } from 'antd'
import { GraphQLInterfaceType, buildSchema } from 'graphql'
import useBearStore from '@/stores'
import { findBreakingChanges } from '@/utils/schemaDiff'
import { OperationNodesForFieldAstBySchemaReturnType, getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import { useNavigate } from 'react-router-dom'
import _ from 'lodash'

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
        variableTypeList: item?.operationDefNodeAst?.variableTypeList,
      }))
    }

    return []
  }, [typeDefs])

  const operationChangeList = useMemo(() => {
    if (typeDefs && localTypeDefs) {
      const [leftSchema, rightSchema] = [buildSchema(localTypeDefs), buildSchema(typeDefs)]
      const changeList = findBreakingChanges(leftSchema, rightSchema)
      return changeList
    }

    return []
  }, [localTypeDefs, typeDefs])

  const changes = useMemo(() => {
    const result = []

    if (typeDefs && localTypeDefs) {
      const routeTypes = operationNamedTypeListInfo.map((item) => {
        return {
          routePath: item?.operationType + item?.operationName,
          nameTypes: [...(item.namedTypeList || []), ...(item.variableTypeList || [])],
        }
      })

      const changeList = operationChangeList.map((item) => {
        if (item?.routePath) {
          return {
            description: item.description,
            routePath: item?.routePath,
          }
        }

        const existRoute = routeTypes.find((itm) =>
          itm.nameTypes.includes(item?.typeName as unknown as GraphQLInterfaceType),
        )
        if (existRoute) {
          return {
            description: item.description,
            routePath: existRoute?.routePath,
          }
        }
      })

      const tmpChanges = _.groupBy(changeList, 'routePath')

      for (const key in tmpChanges) {
        const element = tmpChanges[key]
        result.push({ routePath: key, descriptionList: element?.map((val) => val?.description) || [] })
      }
    }

    return result
  }, [localTypeDefs, operationChangeList, operationNamedTypeListInfo, typeDefs])

  return (
    <Spin spinning={loading || !typeDefs || !localTypeDefs} style={{ width: '100%', height: 'calc(100vh - 48px)' }}>
      {changes.map((change, index) => {
        console.log(change.routePath)

        return (
          <div style={{ marginBottom: 20 }} key={index}>
            <button
              onClick={() => {
                navigate(`/docs/${change.routePath}`)
              }}
            >
              navigate to the operation
            </button>
            {change?.descriptionList?.map((val, indey) => {
              return <p key={indey}>{val}</p>
            })}
          </div>
        )
      })}
    </Spin>
  )
}

export default Home
