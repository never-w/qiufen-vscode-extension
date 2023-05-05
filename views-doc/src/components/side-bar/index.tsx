import React, { memo, useEffect, useMemo, useState } from 'react'
import { Input, Collapse, Tooltip } from 'antd'
import { SearchOutlined, SwapOutlined, ReloadOutlined, MenuFoldOutlined, UpOutlined } from '@ant-design/icons'
import { useThrottleFn } from '@fruits-chain/hooks-laba'
import classnames from 'classnames'
import styles from './index.module.less'
import type { CollapseProps } from 'antd'
import type { FC } from 'react'
import {
  groupOperations as groupOperationsCopy,
  OperationDefinitionNodeGroupType,
  OperationNodesForFieldAstBySchemaReturnType,
} from '@/utils/operations'
import { NewFieldNodeType } from '@/utils/interface'
import SiderGroup from './components/group'

export interface IProps {
  operationsDefNodeObjList: OperationNodesForFieldAstBySchemaReturnType
  keyword: string
  selectedOperationId: string
  onKeywordChange: (keyword: string) => void
  activeItemKey: string
  setActiveItemKey: (data: string) => void
  handleReload: () => void
}

const DocSidebar: FC<IProps> = ({
  keyword,
  activeItemKey,
  onKeywordChange,
  selectedOperationId,
  setActiveItemKey,
  handleReload,
  operationsDefNodeObjList,
}) => {
  const [top, setTop] = useState(0)
  const [flag, setFlag] = useState(false)
  const [isFocus, setIsFocus] = useState(false)

  const onScroll = useThrottleFn(
    (evt) => {
      setTop(evt.nativeEvent.target.scrollTop)
    },
    { wait: 500 },
  )

  const groupedOperations = useMemo(() => {
    const operationList = operationsDefNodeObjList.map((val) => val.operationDefNodeAst)
    return groupOperationsCopy(operationList)
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
          <Collapse.Panel
            key={groupName}
            header={groupName}
            className={activeKey.includes(groupName) ? styles.collapse_active : ''}
          >
            <SiderGroup
              flag={flag}
              groupName={groupName}
              operationList={operationList}
              activeItemKey={activeItemKey}
              setActiveItemKey={setActiveItemKey}
            />
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
              pattern.test(item.operationDefinitionDescription || '') ||
              // search by arg type
              item.args.some((arg) => pattern.test(arg.type.name)) ||
              // search by return type
              pattern.test((item.selectionSet.selections[0] as NewFieldNodeType).type)
            )
          })
        }

        if (!operationList.length) {
          return null
        }

        return (
          <Collapse.Panel
            key={groupName}
            header={groupName}
            className={activeKey.includes(groupName) ? styles.collapse_active : ''}
          >
            <SiderGroup
              flag={flag}
              groupName={groupName}
              operationList={operationList}
              activeItemKey={activeItemKey}
              setActiveItemKey={setActiveItemKey}
            />
          </Collapse.Panel>
        )
      })
    }
  }, [activeItemKey, activeKey, flag, groupedOperations, keyword, setActiveItemKey])

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
          <SwapOutlined className={classnames(styles.img)} />
        </div>
      </Tooltip>
      <Tooltip title="reload doc">
        <div onClick={handleReload} style={{ bottom: 150 }} className={classnames(styles.topBtn, styles.show)}>
          <ReloadOutlined className={classnames(styles.img)} />
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
          <MenuFoldOutlined className={classnames(styles.img)} />
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
          <UpOutlined className={classnames(styles.img)} />
        </div>
      </Tooltip>
    </div>
  )
}

export default memo(DocSidebar)
