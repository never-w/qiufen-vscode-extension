import { onSchemaDiffToOperationDefs } from '@fruits-chain/qiufen-pro-helpers'
import { Radio, Spin } from 'antd'
import { buildSchema } from 'graphql'
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import useBearStore from '@/stores'

import styles from './index.module.less'
import OperationItem from './operationItem'

import type { RadioChangeEvent } from 'antd'
import type { FC } from 'react'

interface IProps {}

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
    if (graphqlSdl.typeDefs && graphqlSdl.localTypeDefs) {
      const [leftSchema, rightSchema] = [
        buildSchema(graphqlSdl.localTypeDefs),
        buildSchema(graphqlSdl.typeDefs),
      ]
      return onSchemaDiffToOperationDefs(leftSchema, rightSchema)
    }

    return []
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
