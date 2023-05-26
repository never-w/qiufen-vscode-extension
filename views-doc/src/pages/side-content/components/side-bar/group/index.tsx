import { FC, useEffect, useRef } from 'react'
import React, { memo } from 'react'
import { Tooltip, Space, message } from 'antd'
import { CopyOutlined, CheckCircleTwoTone } from '@ant-design/icons'
import classnames from 'classnames'
import ClipboardJS from 'clipboard'
import useBearStore from '@/stores'
import { OperationDefinitionNodeGroupType } from '@/utils/operations'
import { printBatchOperations } from '@/utils/printBatchOperations'
import { Link } from 'react-router-dom'
import VirtualList, { ListRef } from 'rc-virtual-list'
import styles from './index.module.less'

// 分组大小
const groupCount = 35

// 控制滚动条滚动那部分代码执行一次
let isControllingExecuted = false

const OperationItem = ({
  operation,
  workspaceGqlNames,
  isMoreExist,
  switchBothZhEn,
  active,
  isMakeVirtual,
}: {
  /** 区分是不是走的虚拟列表模式 */
  isMakeVirtual?: boolean
  operation: OperationDefinitionNodeGroupType
  active: boolean
  workspaceGqlNames: string[]
  isMoreExist: boolean
  switchBothZhEn: boolean
}) => {
  useEffect(() => {
    // 一下是不通过虚拟列表实现的时候滚动条滚到当前激活的item位置
    if (!isControllingExecuted && !isMakeVirtual) {
      // 找到当前被激活的分类标题
      const antCollapseContentActive = document.querySelector('.ant-collapse-content-active') as HTMLDivElement
      // 当前激活的item
      const activeItm = document.querySelector('#activeItem') as HTMLDivElement
      // 滚动条归属的盒子
      const sidebarContent = document.querySelector('#sidebarContent') as HTMLDivElement

      // 将滚动条滚到当前被激活的分类标题的位置
      sidebarContent?.scrollTo({
        top: Math.max(0, activeItm?.offsetTop + antCollapseContentActive?.offsetTop - 200),
      })
      isControllingExecuted = true
    }

    return () => {
      isControllingExecuted = false
    }
  }, [isMakeVirtual])

  return (
    <div>
      <Link to={`/docs/${operation.operation + operation.name?.value}`}>
        <div
          id={active ? 'activeItem' : ''}
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
  const virtualListRef = useRef<ListRef>(null)
  const { workspaceGqlNames, workspaceGqlFileInfo, isAllAddComment } = useBearStore((ste) => ste)
  // 这里是将不合法的字符串转为合法使用的 html id
  const id = groupName.replace(/[.\s]+/g, '_')
  const containerHeight = Math.min(operationList.length * 42, 750)

  useEffect(() => {
    // 以下是 虚拟列表滚到到当前激活的item位置
    let index = 0
    operationList.forEach((itm, indey) => {
      if (itm.operation + itm.name?.value === activeItemKey) {
        index = indey
      }
    })

    virtualListRef.current?.scrollTo({
      index,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {/* 分组小于等于 groupCount 渲染  */}
      {operationList.length <= groupCount &&
        operationList.map((operation) => {
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
        })}
      {/* 分组大于 groupCount 渲染  */}
      {operationList.length > groupCount && (
        <VirtualList
          ref={virtualListRef}
          data={operationList}
          height={containerHeight}
          itemHeight={45}
          itemKey={(operation) => operation.operation + operation.name?.value}
        >
          {(operation) => {
            const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item) =>
              item.operationNames.includes(operation.name!.value),
            )
            const isMoreExist = filtrationWorkspaceGqlFileInfo?.length > 1

            return (
              <OperationItemCom
                isMakeVirtual
                active={operation.operation + operation.name?.value === activeItemKey}
                key={operation.operation + operation.name?.value}
                operation={operation}
                workspaceGqlNames={workspaceGqlNames}
                isMoreExist={isMoreExist}
                switchBothZhEn={switchBothZhEn}
              />
            )
          }}
        </VirtualList>
      )}
    </div>
  )
}

export default memo(SiderGroup)
