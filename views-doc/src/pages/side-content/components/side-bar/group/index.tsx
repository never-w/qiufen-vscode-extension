import { FC, useMemo } from 'react'
import React, { memo } from 'react'
import { Tooltip, Space, message } from 'antd'
import { CopyOutlined, CheckCircleTwoTone } from '@ant-design/icons'
import classnames from 'classnames'
import ClipboardJS from 'clipboard'
import styles from './index.module.less'
import useBearStore from '@/stores'
import { OperationDefinitionNodeGroupType } from '@/utils/operations'
import { printBatchOperations } from '@/utils/printBatchOperations'
import { Link } from 'react-router-dom'

const OperationItem = ({
  operation,
  workspaceGqlNames,
  isMoreExist,
  switchBothZhEn,
  active,
}: {
  operation: OperationDefinitionNodeGroupType
  active: boolean
  workspaceGqlNames: string[]
  isMoreExist: boolean
  switchBothZhEn: boolean
}) => {
  return (
    <div>
      <Link to={`/docs/${operation.operation + operation.name?.value}`}>
        <div
          className={classnames(styles.operationItem, {
            [styles.active]: active,
          })}
        >
          <Space direction="horizontal">
            <CheckCircleTwoTone
              style={{
                visibility: workspaceGqlNames.includes(operation.name!.value) ? 'visible' : 'hidden',
              }}
              twoToneColor={isMoreExist ? '#FE9800' : '#52c41a'}
            />
            {switchBothZhEn
              ? operation.name?.value
              : getOperationNameValue(operation.operationDefinitionDescription) || operation.name?.value}
          </Space>
        </div>
      </Link>
    </div>
  )
}
const OperationItemCom = memo(OperationItem)

interface IProps {
  switchBothZhEn: boolean
  groupName: string
  activeItemKey: string
  operationList: OperationDefinitionNodeGroupType[]
}

const copy = (selector: string) => {
  const clipboard = new ClipboardJS(selector)
  clipboard.on('success', () => {
    message.success('success')
    clipboard.destroy()
  })
  clipboard.on('error', () => {
    message.error('failed')
    clipboard.destroy()
  })
}

const getOperationNameValue = (name: string = '') => {
  const [_, val] = name.split(':')
  return val
}

const SiderGroup: FC<IProps> = ({ switchBothZhEn, groupName, activeItemKey, operationList }) => {
  const { workspaceGqlNames, workspaceGqlFileInfo, isAllAddComment } = useBearStore((ste) => ste)
  // 这里是将不合法的字符串转为合法使用的 html id
  const id = groupName.replace(/[.\s]+/g, '_')

  const contentJSX = useMemo(() => {
    return operationList.map((operation) => {
      const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item) =>
        item.operationNames.includes(operation.name!.value),
      )
      const isMoreExist = filtrationWorkspaceGqlFileInfo?.length > 1

      return (
        <OperationItemCom
          active={operation.operation + operation.name?.value === activeItemKey}
          key={operation.operation + operation.name?.value}
          operation={operation}
          workspaceGqlNames={workspaceGqlNames}
          isMoreExist={isMoreExist}
          switchBothZhEn={switchBothZhEn}
        />
      )
    })
  }, [activeItemKey, switchBothZhEn, operationList, workspaceGqlFileInfo, workspaceGqlNames])

  return (
    <div className={styles.operationList}>
      <Tooltip title="Copy GQL">
        <CopyOutlined
          id={id}
          data-clipboard-text={printBatchOperations(operationList, isAllAddComment)}
          className={styles.copyBtn}
          onClick={() => {
            copy(`#${id}`)
          }}
        />
      </Tooltip>
      {contentJSX}
    </div>
  )
}

export default memo(SiderGroup)
