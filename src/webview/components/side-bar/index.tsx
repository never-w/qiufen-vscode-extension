import React, { memo, useEffect, useMemo, useState } from 'react'
import { Input, Collapse, Tooltip, Space, message } from 'antd'
import { CopyOutlined, SearchOutlined, CheckCircleTwoTone } from '@ant-design/icons'
import { useThrottleFn } from '@fruits-chain/hooks-laba'
import classnames from 'classnames'
import ClipboardJS from 'clipboard'
import styles from './index.module.less'
import type { CollapseProps } from 'antd'
import type { TypedOperation } from '@fruits-chain/qiufen-helpers'
import type { FC } from 'react'
import useBearStore from '@/webview/stores'
import { groupOperations as groupOperationsCopy, OperationDefinitionNodeGroupType, OperationNodesForFieldAstBySchemaReturnType } from '@/utils-copy/operations'
import { printBatchOperations } from '@/utils-copy/printBatchOperations'

export const copy = (selector: string) => {
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

export interface IProps {
  operationsDefNodeObjList: OperationNodesForFieldAstBySchemaReturnType
  keyword: string
  selectedOperationId: string
  onKeywordChange: (keyword: string) => void
  onSelect: (operation: TypedOperation) => void
  activeItemKey: string
  setActiveItemKey: (data: string) => void
  handleReload: () => void
}

const DocSidebar: FC<IProps> = ({ keyword, activeItemKey, onKeywordChange, onSelect, selectedOperationId, setActiveItemKey, handleReload, operationsDefNodeObjList }) => {
  const [top, setTop] = useState(0)
  const [flag, setFlag] = useState(false)
  const [isFocus, setIsFocus] = useState(false)
  const { workspaceGqlNames, workspaceGqlFileInfo } = useBearStore((ste) => ste)

  const onScroll = useThrottleFn(
    (evt) => {
      setTop(evt.nativeEvent.target.scrollTop)
    },
    { wait: 300 },
  )

  const groupedOperations = useMemo(() => {
    const operationList = operationsDefNodeObjList.map((val) => val.operationDefNodeAst)
    return groupOperationsCopy(operationList as OperationDefinitionNodeGroupType[])
  }, [operationsDefNodeObjList])

  const [activeKey, setActiveKey] = useState([''])

  useEffect(() => {
    const activeKey: CollapseProps['defaultActiveKey'] = []
    Object.entries(groupedOperations).some(([groupName, items]) => {
      if (items.some((item) => item.operation + item.name?.value === selectedOperationId)) {
        activeKey.push(groupName)
      }
    })
    setActiveKey(activeKey as string[])
    setActiveItemKey(selectedOperationId)
  }, [groupedOperations, selectedOperationId, setActiveItemKey])

  const contentJSX = useMemo(() => {
    const newKeyword = keyword.trim()
    const groupedOperationsEntries = Object.entries(groupedOperations)

    let exactGroupedOperationsEntries = [] as [string, OperationDefinitionNodeGroupType[]][]
    if (newKeyword) {
      exactGroupedOperationsEntries = groupedOperationsEntries.filter(([groupName, operationData]) => {
        const names = operationData.map((i) => i.name?.value)
        return names.includes(newKeyword)
      })
    }

    // 精确匹配operation name
    if (exactGroupedOperationsEntries.length) {
      return exactGroupedOperationsEntries.map(([groupName, operationData]) => {
        let operationList = operationData

        if (newKeyword) {
          operationList = operationData.filter((item) => {
            return item.name?.value === newKeyword
          })
        }

        if (!operationList.length) {
          return null
        }

        return (
          <Collapse.Panel key={groupName} header={groupName} className={activeKey.includes(groupName) ? styles.collapse_active : ''}>
            <div className={styles.operationList}>
              <Tooltip title="Copy GQL">
                <CopyOutlined
                  id={groupName}
                  data-clipboard-text={printBatchOperations(operationList)}
                  className={styles.copyBtn}
                  onClick={() => {
                    // TODO: 处理id有空格的bug eg. v2.8 次品销售
                    copy(`#${groupName}`)
                  }}
                />
              </Tooltip>
              {operationList.map((operation, index) => {
                const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item: any) => item.operationNames.includes(operation.name?.value))
                const isMoreExist = filtrationWorkspaceGqlFileInfo?.length > 1
                return (
                  <div
                    key={index}
                    className={classnames(styles.operationItem, {
                      [styles.active]: operation.operation + operation.name?.value === activeItemKey,
                    })}
                    onClick={() => {
                      onSelect(operation as any)
                      setActiveItemKey(operation.operation + operation.name?.value)
                    }}
                  >
                    <div>
                      <Space direction="horizontal">
                        <CheckCircleTwoTone
                          style={{ visibility: workspaceGqlNames.includes(operation.name!.value) ? 'visible' : 'hidden' }}
                          twoToneColor={isMoreExist ? '#FE9800' : '#52c41a'}
                        />
                        {flag ? operation.name?.value : getOperationNameValue(operation.operationDefinitionDescription) || operation.name?.value}
                      </Space>
                    </div>
                  </div>
                )
              })}
            </div>
          </Collapse.Panel>
        )
      })
    } else {
      return groupedOperationsEntries.map(([groupName, operationData]) => {
        let operationList = operationData

        const pattern = new RegExp(keyword, 'i')
        // search by group name
        if (pattern.test(groupName)) {
          // break
        } else if (newKeyword) {
          operationList = operationData.filter((item) => {
            return (
              // search by name
              pattern.test(item.name!.value) ||
              // search by description
              pattern.test(item.operationDefinitionDescription || '')
            )
          })
        }

        if (!operationList.length) {
          return null
        }

        return (
          <Collapse.Panel key={groupName} header={groupName} className={activeKey.includes(groupName) ? styles.collapse_active : ''}>
            <div className={styles.operationList}>
              <Tooltip title="Copy GQL">
                <CopyOutlined
                  id={groupName}
                  data-clipboard-text={printBatchOperations(operationList)}
                  className={styles.copyBtn}
                  onClick={() => {
                    copy(`#${groupName}`)
                  }}
                />
              </Tooltip>
              {operationList.map((operation, index) => {
                const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item: any) => item.operationNames.includes(operation.name?.value))
                const isMoreExist = filtrationWorkspaceGqlFileInfo?.length > 1
                return (
                  <div
                    key={index}
                    className={classnames(styles.operationItem, {
                      [styles.active]: operation.operation + operation.name?.value === activeItemKey,
                    })}
                    onClick={() => {
                      onSelect(operation as any)
                      setActiveItemKey(operation.operation + operation.name?.value)
                    }}
                  >
                    <div>
                      <Space direction="horizontal">
                        <CheckCircleTwoTone
                          style={{ visibility: workspaceGqlNames.includes(operation.name!.value) ? 'visible' : 'hidden' }}
                          twoToneColor={isMoreExist ? '#FE9800' : '#52c41a'}
                        />
                        {flag ? operation.name?.value : getOperationNameValue(operation.operationDefinitionDescription) || operation.name?.value}
                      </Space>
                    </div>
                  </div>
                )
              })}
            </div>
          </Collapse.Panel>
        )
      })
    }
  }, [activeItemKey, activeKey, flag, groupedOperations, keyword, onSelect, setActiveItemKey, workspaceGqlFileInfo, workspaceGqlNames])

  return (
    <div className={styles.sidebar}>
      <div className={styles.wrapper_search}>
        <Input
          className={styles.search}
          onFocus={() => {
            setIsFocus(true)
          }}
          onBlur={() => {
            setIsFocus(false)
          }}
          suffix={<SearchOutlined className={isFocus ? styles.icon_color : ''} />}
          size="large"
          placeholder="Search by group/desc/name/type"
          onChange={(evt) => {
            onKeywordChange(evt.target.value)
          }}
          value={keyword}
        />
      </div>
      <div className={styles.main} id="sideBar" onScroll={onScroll.run}>
        <Collapse
          className={styles.collapse_box}
          bordered={false}
          activeKey={activeKey}
          onChange={(key) => {
            if (Array.isArray(key)) {
              setActiveKey(key)
            }
          }}
        >
          {contentJSX}
        </Collapse>
      </div>
      <Tooltip title="switching operation language">
        <div
          onClick={() => {
            setFlag(!flag)
          }}
          style={{ bottom: 200 }}
          className={classnames(styles.topBtn, styles.show)}
        >
          <img src="https://pic.imgdb.cn/item/64189a40a682492fccf8840e.png" alt="切换operations name" />
        </div>
      </Tooltip>
      <Tooltip title="reload doc">
        <div onClick={handleReload} style={{ bottom: 150 }} className={classnames(styles.topBtn, styles.show)}>
          <img src="https://pic.imgdb.cn/item/63d72e6eface21e9ef36b62f.png" alt="刷新文档" />
        </div>
      </Tooltip>
      <Tooltip title="Collapse all">
        <div
          style={{ bottom: 100 }}
          className={classnames(styles.topBtn, {
            [styles.show]: activeKey.length,
          })}
          onClick={() => {
            setActiveKey([])
          }}
        >
          <img src="https://pic.imgdb.cn/item/63d72e52face21e9ef367a25.png" alt="全部收集图片" />
        </div>
      </Tooltip>
      <Tooltip title="Back to top">
        <div
          className={classnames(styles.topBtn, {
            [styles.show]: top > 700,
          })}
          onClick={() => {
            document.getElementById('sideBar')?.scrollTo(0, 0)
          }}
        >
          <img src="https://pic.imgdb.cn/item/63d72e7fface21e9ef36d8ed.png" alt="返回顶部图片" />
        </div>
      </Tooltip>
    </div>
  )
}

export default memo(DocSidebar)
