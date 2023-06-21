import React from 'react'

import { OperationStatusTypeEnum } from '..'

import styles from './index.module.less'

import type { FC } from 'react'
import type { NavigateFunction } from 'react-router-dom'

interface IProps {
  changeItem: {
    type: OperationStatusTypeEnum
    operationComment?: any
    operationType?: string | undefined
    operationName?: string | undefined
    routePath: string
    descriptionList?: string[]
  }
  navigate: NavigateFunction
}

const OperationItem: FC<IProps> = ({ changeItem, navigate }) => {
  return (
    <div
      key={changeItem.routePath}
      className={styles.operationItem}
      attr-deleted={
        changeItem.type === OperationStatusTypeEnum.DELETED ? 'true' : 'false'
      }
      attr-added={
        changeItem.type === OperationStatusTypeEnum.ADDED ? 'true' : 'false'
      }>
      <div className={styles.operationItemHeader}>
        <div
          className={styles.operationItemTitle}
          attr-deleted={
            changeItem.type === OperationStatusTypeEnum.DELETED
              ? 'true'
              : 'false'
          }>
          {changeItem?.operationComment
            ? `${changeItem?.operationComment}（${changeItem?.operationType}：${changeItem?.operationName}）`
            : `${changeItem?.operationType}：${changeItem?.operationName}`}
        </div>
        <div
          className={styles.operationItemNavigator}
          attr-deleted={
            changeItem.type === OperationStatusTypeEnum.DELETED
              ? 'true'
              : 'false'
          }
          onClick={() => {
            navigate(`/docs/${changeItem.routePath}`)
          }}>
          navigate to view
        </div>
      </div>
      {changeItem?.descriptionList?.map((val, indey) => {
        return (
          <div
            key={changeItem.routePath + indey}
            className={styles.operationItemBody}>
            {val}
          </div>
        )
      })}
    </div>
  )
}

export default OperationItem
