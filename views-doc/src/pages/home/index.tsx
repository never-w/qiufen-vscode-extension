import { Radio, Spin } from 'antd'
import { buildSchema } from 'graphql'
import _ from 'lodash'
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useBearStore from '@/stores'
import type { OperationNodesForFieldAstBySchemaReturnType } from '@/utils/operations'
import { getOperationNodesForFieldAstBySchema } from '@/utils/operations'
import { BreakingChangeType, findBreakingChanges } from '@/utils/schemaDiff'

import styles from './index.module.less'
import OperationItem from './operationItem'

import type { RadioChangeEvent } from 'antd'
import type { GraphQLInterfaceType } from 'graphql'
import type { FC } from 'react'

interface IProps {}

type ChangeListType = {
  operationComment?: string
  operationType?: string
  operationName?: string
  description: string
  routePath: string
  type?: BreakingChangeType
}

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

export enum OperationStatusTypeEnum {
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
  const { fetchRemoteTypeDefs } = useBearStore(state => state)
  const [loading, setLoading] = useState(false)
  const [radioValue, setRadioValue] = useState(OperationStatusTypeEnum.ALL)
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
      const [leftSchema, rightSchema] = [
        buildSchema(graphqlSdl.localTypeDefs),
        buildSchema(graphqlSdl.typeDefs),
      ]

      const operationChangeList = findBreakingChanges(leftSchema, rightSchema)

      const operationFields: OperationNodesForFieldAstBySchemaReturnType =
        getOperationNodesForFieldAstBySchema(rightSchema)

      const operationNamedTypeListInfo = operationFields.map(item => ({
        // @ts-ignore
        operationComment: item?.operationDefNodeAst?.descriptionText,
        operationType: item?.operationDefNodeAst?.operation,
        operationName: item?.operationDefNodeAst?.name?.value,
        namedTypeList: item?.operationDefNodeAst?.namedTypeList,
        variableTypeList: item?.operationDefNodeAst?.variableTypeList,
      }))

      const routeTypes = operationNamedTypeListInfo.map(item => {
        return {
          operationComment: item?.operationComment,
          operationType: item?.operationType,
          operationName: item?.operationName,
          routePath: item?.operationType + item?.operationName,
          nameTypes: [
            ...(item.namedTypeList || []),
            ...(item.variableTypeList || []),
          ],
        }
      })

      const changeList: ChangeListType[] = []
      operationChangeList.forEach(item => {
        if (item?.routePath) {
          const res = routeTypes.find(val => {
            return val?.routePath === item?.routePath
          })

          const typeNameAndType = formatRoutePath(item?.routePath)

          changeList.push({
            operationComment: res?.operationComment,
            operationType: typeNameAndType?.operationType,
            operationName: typeNameAndType?.operationName,
            type:
              // 这里其实还要算上 "!!item?.routePath" 条件
              item.type === BreakingChangeType.FIELD_REMOVED ||
              item.type === BreakingChangeType.FIELD_ADDED
                ? item.type
                : undefined,
            description: item.description,
            routePath: item?.routePath,
          })
        }

        const existRoute = routeTypes.filter(itm =>
          itm.nameTypes.includes(
            item?.typeName as unknown as GraphQLInterfaceType,
          ),
        )

        if (existRoute.length === 1) {
          changeList.push({
            operationComment: existRoute[0]?.operationComment,
            operationType: existRoute[0]?.operationType,
            operationName: existRoute[0]?.operationName,
            description: item.description,
            routePath: existRoute[0]?.routePath,
          })
        } else if (existRoute.length > 1) {
          // eslint-disable-next-line @typescript-eslint/no-shadow
          const result = existRoute.map(routeItem => ({
            operationComment: routeItem?.operationComment,
            operationType: routeItem?.operationType,
            operationName: routeItem?.operationName,
            description: item.description,
            routePath: routeItem?.routePath,
          }))

          changeList.push(...result)
        }
      })

      const tmpChanges = _.groupBy(changeList, 'routePath') || {}

      for (const key in tmpChanges) {
        const element = tmpChanges[key]
        result.push({
          operationComment: element[0]?.operationComment,
          operationType: element[0]?.operationType,
          operationName: element[0]?.operationName,
          routePath: key,
          type: element.find(ele => ele?.type)?.type,
          descriptionList: element?.map(val => val?.description) || [],
        })
      }
    }

    const tmpResult = result.map(operation => {
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

  const onRadioChange = ({ target: { value } }: RadioChangeEvent) => {
    setRadioValue(value)
  }

  return (
    <Spin spinning={loading || !graphqlSdl.typeDefs}>
      <Radio.Group
        style={{ marginBottom: 16 }}
        options={radioOptions}
        onChange={onRadioChange}
        value={radioValue}
        optionType="button"
        buttonStyle="solid"
      />
      <div className={styles.container}>
        <>
          {!!graphqlSdl.localTypeDefs && (
            <>
              {radioValue === OperationStatusTypeEnum.ALL && (
                <div
                  className={styles.flexLayout}
                  attr-flex={changes.length >= 3 ? 'true' : 'false'}>
                  {changes.map(change => {
                    return (
                      <OperationItem
                        key={change.routePath}
                        changeItem={change}
                        navigate={navigate}
                      />
                    )
                  })}
                </div>
              )}

              {radioValue === OperationStatusTypeEnum.DELETED && (
                <div
                  className={styles.flexLayout}
                  attr-flex={
                    changes.filter(
                      change => change.type === OperationStatusTypeEnum.DELETED,
                    ).length >= 3
                      ? 'true'
                      : 'false'
                  }>
                  {changes.map(change => {
                    if (change.type === OperationStatusTypeEnum.DELETED) {
                      return (
                        <OperationItem
                          key={change.routePath}
                          changeItem={change}
                          navigate={navigate}
                        />
                      )
                    }
                    return null
                  })}
                </div>
              )}

              {radioValue === OperationStatusTypeEnum.EDITED && (
                <div
                  className={styles.flexLayout}
                  attr-flex={
                    changes.filter(
                      change => change.type === OperationStatusTypeEnum.EDITED,
                    ).length >= 3
                      ? 'true'
                      : 'false'
                  }>
                  {changes.map(change => {
                    if (change.type === OperationStatusTypeEnum.EDITED) {
                      return (
                        <OperationItem
                          key={change.routePath}
                          changeItem={change}
                          navigate={navigate}
                        />
                      )
                    }
                    return null
                  })}
                </div>
              )}

              {radioValue === OperationStatusTypeEnum.ADDED && (
                <div
                  className={styles.flexLayout}
                  attr-flex={
                    changes.filter(
                      change => change.type === OperationStatusTypeEnum.ADDED,
                    ).length >= 3
                      ? 'true'
                      : 'false'
                  }>
                  {changes.map(change => {
                    if (change.type === OperationStatusTypeEnum.ADDED) {
                      return (
                        <OperationItem
                          key={change.routePath}
                          changeItem={change}
                          navigate={navigate}
                        />
                      )
                    }
                    return null
                  })}
                </div>
              )}
            </>
          )}
          {!graphqlSdl.localTypeDefs && null}
        </>
      </div>
    </Spin>
  )
}

export default Home
