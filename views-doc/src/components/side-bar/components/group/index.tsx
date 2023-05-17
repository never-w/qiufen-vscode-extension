import { FC } from 'react'
import React, { memo } from 'react'
import { Tooltip, Space, message } from 'antd'
import { CopyOutlined, CheckCircleTwoTone } from '@ant-design/icons'
import classnames from 'classnames'
import ClipboardJS from 'clipboard'
import styles from '../../index.module.less'
import useBearStore from '@/stores'
import { OperationDefinitionNodeGroupType } from '@/utils/operations'
import { printBatchOperations } from '@/utils/printBatchOperations'
import { useNavigate } from 'react-router-dom'

interface IProps {
  flag: boolean
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

const SiderGroup: FC<IProps> = ({ flag, groupName, activeItemKey, operationList }) => {
  const navigate = useNavigate()
  const { workspaceGqlNames, workspaceGqlFileInfo, isAllAddComment } = useBearStore((ste) => ste)
  // 这里是将不合法的字符串转为合法使用的 html id
  const id = groupName.replace(/[.\s]+/g, '_')

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
      {operationList.map((operation, index) => {
        const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item: any) =>
          item.operationNames.includes(operation.name?.value),
        )
        const isMoreExist = filtrationWorkspaceGqlFileInfo?.length > 1
        return (
          <div
            key={index}
            className={classnames(styles.operationItem, {
              [styles.active]: operation.operation + operation.name?.value === activeItemKey,
            })}
            onClick={() => {
              navigate(`/${operation.operation + operation.name?.value}`)
            }}
          >
            <div>
              <Space direction="horizontal">
                <CheckCircleTwoTone
                  style={{
                    visibility: workspaceGqlNames.includes(operation.name!.value) ? 'visible' : 'hidden',
                  }}
                  twoToneColor={isMoreExist ? '#FE9800' : '#52c41a'}
                />
                {flag
                  ? operation.name?.value
                  : getOperationNameValue(operation.operationDefinitionDescription) || operation.name?.value}
              </Space>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(SiderGroup)
