import React, { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { FieldNode, OperationDefinitionNode } from 'graphql'
import { message, Space, Tooltip, Switch, Button } from 'antd'
import { CopyOutlined, LoadingOutlined, MenuFoldOutlined, EditOutlined } from '@ant-design/icons'
import ClipboardJS from 'clipboard'
import styles from './index.module.less'
import useBearStore from '@/stores'
import { OperationNodesForFieldAstBySchemaReturnType } from '@/utils/operations'
import { NewFieldNodeType } from '@/utils/interface'
import { resolveOperationDefsForFieldNodeTree } from '@/utils/resolveOperationDefsForFieldNodeTree'
import {
  dependOnWorkspaceFieldKeysToFieldAstTree,
  getFieldNodeAstCheckedIsTrueKeys,
} from '@/utils/dependOnSelectedAndKeyFieldAst'
import { getWorkspaceOperationsExistFieldKeys } from '@/utils/getWorkspaceOperationsExistFieldKeys'
import { relyOnKeysPrintOperation } from '@/utils/relyOnKeysPrintOperation'
import { GetWorkspaceGqlFileInfoReturnType } from '@/utils/syncWorkspaceGqls'
import InSetModal from '../modal'
import FieldTable from '../field-table'
import OperationStructure from '../operation-structure'
import DiffViewer from '../diff-viewer'

interface IProps {
  operationObj: OperationNodesForFieldAstBySchemaReturnType[number]
}

export enum SwitchToggleEnum {
  EDITOR,
  TABLE,
  DIFF,
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

const OperationDoc: FC<IProps> = ({ operationObj }) => {
  const { operationDefNode, operationName, operationType } = useMemo(
    () => ({
      operationDefNode: operationObj.operationDefNodeAst,
      operationName: operationObj.operationDefNodeAst.name!.value,
      operationType: operationObj.operationDefNodeAst.operation,
    }),
    [operationObj.operationDefNodeAst],
  )

  const fieldNodeAstTreeTmp = useMemo(() => {
    // 远程得到的operation第一层的 selectionSet.selections 始终都只会存在数组长度为1，因为这是我转换schema对象转好operation ast函数里写的就是这样
    return resolveOperationDefsForFieldNodeTree(operationDefNode.selectionSet.selections[0] as NewFieldNodeType)
  }, [operationDefNode.selectionSet.selections])

  const { isDisplaySidebar, setState, workspaceGqlFileInfo, isAllAddComment } = useBearStore((ste) => ste)
  const [mode, setMode] = useState<SwitchToggleEnum>(SwitchToggleEnum.TABLE)
  const [spinIcon, setSpinIcon] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [fieldNodeAstTree, setFieldNodeAstTree] = useState<NewFieldNodeType>(fieldNodeAstTreeTmp)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filteredWorkspaceGqlFileInfo, setFilteredWorkspaceGqlFileInfo] = useState<GetWorkspaceGqlFileInfoReturnType[]>(
    [],
  )

  // 一键填入事件
  const handleOneKeyFillEvent = useCallback(async () => {
    setSpinIcon(true)
    let operationStr
    try {
      operationStr = await relyOnKeysPrintOperation(operationDefNode, selectedKeys, isAllAddComment)
    } catch (error) {
      setSpinIcon(false)
      message.error(error)
    }

    if (operationStr) {
      fetch('/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operationStr, gqlName: operationName }),
      })
        .then((response) => {
          if (response.ok) {
            // 成功响应处理
            return response.json() // 解析响应数据为JSON格式
          } else {
            if (response.status === 406) {
              // 处理错误响应
              throw new Error('The operation does not exist in a local file')
            } else {
              // 处理错误响应
              throw new Error('一键填入失败')
            }
          }
        })
        .then((data) => {
          if (Array.isArray(data.message) && data.message?.length) {
            setFilteredWorkspaceGqlFileInfo(data.message?.length ? data.message : [])
            setIsModalOpen(true)
          } else {
            message.success(data.message)
          }
        })
        .catch((error) => {
          message.error(error.message)
        })
        .finally(() => {
          setSpinIcon(false)
        })
    }
  }, [isAllAddComment, operationDefNode, operationName, selectedKeys])

  // 点击copy事件，这样创建元素骚操作是为了提高性能
  const handleCopyClick = useCallback(async () => {
    try {
      const operationStr = await relyOnKeysPrintOperation(operationDefNode, selectedKeys, isAllAddComment)
      function copyClick() {
        copy('#copydiv')
      }
      const newElement = document.createElement('div')
      newElement.id = 'copydiv'
      newElement.setAttribute('data-clipboard-text', operationStr)
      newElement.innerHTML = ''
      newElement.addEventListener('click', copyClick)
      newElement.style.display = 'none'
      document.body.appendChild(newElement)
      newElement.click()
      newElement.removeEventListener('click', copyClick)
      newElement.remove()
    } catch (error) {
      message.error(error)
    }
  }, [isAllAddComment, operationDefNode, selectedKeys])

  useLayoutEffect(() => {
    let resultKeys = [] as string[]
    const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item) =>
      item.operationNames.includes(operationName),
    )

    // 这个接口在工作区存在于多个文件夹，这种情况我不管它
    if (filtrationWorkspaceGqlFileInfo?.length >= 2) {
      resultKeys = []
    } else if (filtrationWorkspaceGqlFileInfo?.length === 1) {
      const operationDefinitionNodes = filtrationWorkspaceGqlFileInfo[0]?.operationsAsts as OperationDefinitionNode[]
      let operationNameFieldNode: FieldNode | undefined
      operationDefinitionNodes?.forEach((operationNode) => {
        const sameOperationNameFieldNode = (operationNode.selectionSet.selections as FieldNode[])?.find(
          (itm) => itm.name.value === operationName,
        )
        if (!!sameOperationNameFieldNode) {
          operationNameFieldNode = sameOperationNameFieldNode
        }
      })
      resultKeys = getWorkspaceOperationsExistFieldKeys(operationNameFieldNode)
    }

    const newFieldNodeAstTree = dependOnWorkspaceFieldKeysToFieldAstTree(fieldNodeAstTreeTmp, resultKeys)
    const selectedKeysTmp = getFieldNodeAstCheckedIsTrueKeys(newFieldNodeAstTree)

    setFieldNodeAstTree(newFieldNodeAstTree)
    setSelectedKeys(selectedKeysTmp)
  }, [fieldNodeAstTreeTmp, operationName, workspaceGqlFileInfo])

  return (
    <>
      {!!isModalOpen && (
        <InSetModal
          operationDefNode={operationDefNode}
          selectedKeys={selectedKeys}
          filteredWorkspaceGqlFileInfo={filteredWorkspaceGqlFileInfo}
          isModalOpen={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false)
          }}
        />
      )}
      <Space className={styles.operationDoc} direction="vertical">
        <div className={styles.name}>
          <Space size={40}>
            <span>
              Operation name:
              <span className={styles.operationName}>{` ${operationName}`}</span>
            </span>
            <span>
              Operation type:
              <span className={styles.operationName}>{` ${operationType}`}</span>
            </span>
          </Space>
          <Space size={50}>
            <Tooltip title="Hide Sidebar">
              <Button
                type="text"
                onClick={() => {
                  setState({ isDisplaySidebar: !isDisplaySidebar })
                }}
              >
                <Space id="sidebar" className={styles.copyBtn}>
                  <MenuFoldOutlined />
                  <span className={styles.text}>Hide Sidebar</span>
                </Space>
              </Button>
            </Tooltip>
            <Tooltip title="一键填入">
              <Space className={styles.copyBtn} onClick={handleOneKeyFillEvent}>
                {!spinIcon ? <EditOutlined /> : <LoadingOutlined />}
                <span className={styles.text}>一键填入</span>
              </Space>
            </Tooltip>
            <Tooltip title="Copy GQL">
              <Space className={styles.copyBtn} onClick={handleCopyClick}>
                <CopyOutlined />
                <span className={styles.text}>Copy GQL</span>
              </Space>
            </Tooltip>
            <div className={styles.switch_box}>
              <Switch
                className={styles.switch_diff}
                size="default"
                checked={mode === SwitchToggleEnum.DIFF}
                checkedChildren="diff"
                unCheckedChildren="diff"
                onClick={(checked) => {
                  if (checked) {
                    setMode(SwitchToggleEnum.DIFF)
                  } else {
                    setMode(SwitchToggleEnum.TABLE)
                  }
                }}
              />
              <Switch
                size="default"
                checked={mode === SwitchToggleEnum.EDITOR}
                checkedChildren="editor"
                unCheckedChildren="table"
                onClick={(checked) => {
                  if (checked) {
                    setMode(SwitchToggleEnum.EDITOR)
                  } else {
                    setMode(SwitchToggleEnum.TABLE)
                  }
                }}
              />
            </div>
          </Space>
        </div>
        {mode === SwitchToggleEnum.TABLE && (
          <FieldTable
            // 这里唯一key是为了支持默认打开的 tree data depth
            key={operationType + operationName}
            isShow={mode === SwitchToggleEnum.TABLE}
            operationDefNode={operationDefNode}
            selectedKeys={selectedKeys}
            setSelectedKeys={setSelectedKeys}
            setFieldNodeAstTree={setFieldNodeAstTree}
            fieldNodeAstTree={fieldNodeAstTree}
            fieldNodeAstTreeTmp={fieldNodeAstTreeTmp}
          />
        )}
        {mode === SwitchToggleEnum.EDITOR && (
          <OperationStructure isShow={mode === SwitchToggleEnum.EDITOR} operationDefNode={operationDefNode} />
        )}
        {mode === SwitchToggleEnum.DIFF && (
          <DiffViewer isShow={mode === SwitchToggleEnum.DIFF} operationDefNode={operationDefNode} />
        )}
      </Space>
    </>
  )
}

export default memo(OperationDoc)
