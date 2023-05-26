import React, { FC, useEffect, useMemo, useState } from 'react'
import { Alert, Card, Radio, RadioChangeEvent, Space, Spin } from 'antd'
import { GraphQLInterfaceType, buildSchema } from 'graphql'
import useBearStore from '@/stores'
import { BreakingChangeType, findBreakingChanges } from '@/utils/schemaDiff'
import { OperationNodesForFieldAstBySchemaReturnType, getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames'
import _ from 'lodash'
import styles from './index.module.less'

interface IProps {}

function formatRoutePath(str: string) {
  const mutationArr = str.split('mutation')
  const queryArr = str.split('query')

  if (queryArr[1]) {
    return {
      operationType: 'query',
      operationName: queryArr[1],
    }
  } else if (!queryArr[1]) {
    return {
      operationType: 'mutation',
      operationName: mutationArr[1],
    }
  }

  if (mutationArr[1]) {
    return {
      operationType: 'mutation',
      operationName: mutationArr[1],
    }
  } else if (!mutationArr[1]) {
    return {
      operationType: 'query',
      operationName: mutationArr[0],
    }
  }

  return {}
}

enum OperationStatusTypeEnum {
  'ALL' = 'ALL',
  'ADDED' = 'ADDED',
  'EDITED' = 'EDITED',
  'DELETED' = 'DELETED',
}

const radioOptions = [
  { label: '全部', value: OperationStatusTypeEnum.ALL },
  { label: '新增', value: OperationStatusTypeEnum.ADDED },
  { label: '修改', value: OperationStatusTypeEnum.EDITED },
  { label: '删除', value: OperationStatusTypeEnum.DELETED },
]

const Home: FC<IProps> = () => {
  const navigate = useNavigate()
  const { fetchRemoteTypeDefs } = useBearStore((state) => state)
  const [loading, setLoading] = useState(false)
  const [graphqlSdl, setGraphqlSdl] = useState({
    typeDefs: '',
    localTypeDefs: '',
  })

  useMemo(async () => {
    setLoading(true)
    const res = await fetchRemoteTypeDefs()
    setGraphqlSdl(res)
    setLoading(false)
  }, [fetchRemoteTypeDefs])

  const changes = useMemo(() => {
    const result = []

    if (graphqlSdl.typeDefs && graphqlSdl.localTypeDefs) {
      const [leftSchema, rightSchema] = [buildSchema(graphqlSdl.localTypeDefs), buildSchema(graphqlSdl.typeDefs)]

      const operationChangeList = findBreakingChanges(leftSchema, rightSchema)

      const operationFields: OperationNodesForFieldAstBySchemaReturnType =
        getOperationNodesForFieldAstBySchema(rightSchema)

      const operationNamedTypeListInfo = operationFields.map((item) => ({
        // @ts-ignore
        operationComment: item?.operationDefNodeAst?.descriptionText,
        operationType: item?.operationDefNodeAst?.operation,
        operationName: item?.operationDefNodeAst?.name?.value,
        namedTypeList: item?.operationDefNodeAst?.namedTypeList,
        variableTypeList: item?.operationDefNodeAst?.variableTypeList,
      }))

      const routeTypes = operationNamedTypeListInfo.map((item) => {
        return {
          operationComment: item?.operationComment,
          operationType: item?.operationType,
          operationName: item?.operationName,
          routePath: item?.operationType + item?.operationName,
          nameTypes: [...(item.namedTypeList || []), ...(item.variableTypeList || [])],
        }
      })

      const changeList = operationChangeList
        .map((item) => {
          if (item?.routePath) {
            const res = routeTypes.find((val) => {
              return val?.routePath === item?.routePath
            })

            const typeNameAndType = formatRoutePath(item?.routePath)

            return {
              operationComment: res?.operationComment,
              operationType: typeNameAndType?.operationType,
              operationName: typeNameAndType?.operationName,
              type:
                // 这里其实还要算上 "!!item?.routePath" 条件
                item.type === BreakingChangeType.FIELD_REMOVED || item.type === BreakingChangeType.FIELD_ADDED
                  ? item.type
                  : undefined,
              description: item.description,
              routePath: item?.routePath,
            }
          }

          const existRoute = routeTypes.find((itm) =>
            itm.nameTypes.includes(item?.typeName as unknown as GraphQLInterfaceType),
          )
          if (existRoute) {
            return {
              operationComment: existRoute?.operationComment,
              operationType: existRoute?.operationType,
              operationName: existRoute?.operationName,
              description: item.description,
              routePath: existRoute?.routePath,
            }
          }
        })
        ?.filter(Boolean)

      const tmpChanges = _.groupBy(changeList, 'routePath') || {}

      for (const key in tmpChanges) {
        const element = tmpChanges[key]
        result.push({
          operationComment: element[0]?.operationComment,
          operationType: element[0]?.operationType,
          operationName: element[0]?.operationName,
          routePath: key,
          type: element.find((ele) => ele?.type)?.type,
          descriptionList: element?.map((val) => val?.description) || [],
        })
      }
    }

    const tmpResult = result.map((operation) => {
      if (operation.type === BreakingChangeType.FIELD_REMOVED) {
        return {
          ...operation,
          type: OperationStatusTypeEnum.DELETED,
        }
      }

      if (operation.type === BreakingChangeType.FIELD_ADDED) {
        return {
          ...operation,
          type: OperationStatusTypeEnum.ADDED,
        }
      }

      return {
        ...operation,
        type: OperationStatusTypeEnum.EDITED,
      }
    })

    return tmpResult
  }, [graphqlSdl])

  const [value4, setValue4] = useState(OperationStatusTypeEnum.ALL)
  const onChange4 = ({ target: { value } }: RadioChangeEvent) => {
    setValue4(value)
  }

  return (
    <Spin spinning={loading || !graphqlSdl.typeDefs}>
      <Radio.Group
        style={{ marginBottom: 16 }}
        options={radioOptions}
        onChange={onChange4}
        value={value4}
        optionType="button"
        buttonStyle="solid"
      />
      <div className={styles.container}>
        {changes.map((change) => {
          return (
            <div key={change.routePath} className={styles.operationItem}>
              <div className={styles.operationItemHeader}>
                <div className={styles.operationItemTitle}>
                  {change?.operationComment
                    ? `${change?.operationComment}（${change?.operationType}：${change?.operationName}）`
                    : `${change?.operationType}：${change?.operationName}`}
                </div>
                <div
                  className={styles.operationItemNavigator}
                  onClick={() => {
                    navigate(`/docs/${change.routePath}`)
                  }}
                >
                  navigate to view
                </div>
              </div>
              {change?.descriptionList?.map((val, indey) => {
                return (
                  <div key={change.routePath + indey} className={styles.operationItemBody}>
                    {val}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </Spin>
  )
  // return (
  //   <Spin spinning={loading || !typeDefs}>
  //     <div className="wrapper">
  //       {changes.map((change) => {
  //         return (
  //           <Card
  //             key={change.routePath}
  //             className="changeItm"
  //             attr-disabled={change?.type === BreakingChangeType.FIELD_REMOVED ? 'true' : 'false'}
  //             attr-added={change?.type === BreakingChangeType.FIELD_ADDED ? 'true' : 'false'}
  //             size="small"
  //             extra={
  //               <span
  //                 className={classnames('moreBtn', {
  //                   btnDisabled: change?.type === BreakingChangeType.FIELD_REMOVED,
  //                 })}
  //                 onClick={() => {
  //                   navigate(`/docs/${change.routePath}`)
  //                 }}
  //               >
  //                 navigate to view
  //               </span>
  //             }
  //             title={
  //               <p
  //                 className={classnames({
  //                   lineThrough: change?.type === BreakingChangeType.FIELD_REMOVED,
  //                 })}
  //               >
  //                 {change?.operationComment
  //                   ? `${change?.operationComment}（${change?.operationType}：${change?.operationName}）`
  //                   : `${change?.operationType}：${change?.operationName}`}
  //               </p>
  //             }
  //           >
  //             {change?.descriptionList?.map((val, indey) => {
  //               return <p key={change.routePath + indey}>{val}</p>
  //             })}
  //           </Card>
  //         )
  //       })}
  //     </div>
  //   </Spin>
  // )
}

export default Home
