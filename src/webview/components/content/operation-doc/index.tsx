import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { buildSchema, ConstDirectiveNode, FieldNode, GraphQLSchema, OperationDefinitionNode, StringValueNode } from 'graphql'
import { message, Space, Table, Tooltip, Switch, Divider, Tag, Button } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer'
import AceEditor from 'react-ace'
import obj2str from 'stringify-object'
import { CopyOutlined, LoadingOutlined, MenuFoldOutlined, EditOutlined } from '@ant-design/icons'
import ClipboardJS from 'clipboard'
import styles from './index.module.less'
// import { getOperationsBySchema } from '@/utils/operation'
import { printOperationStr, visitDocumentNodeAstGetKeys } from '@/utils/visitOperationTransformer'
import type { ArgTypeDef } from '@fruits-chain/qiufen-helpers'
import useBearStore from '@/webview/stores'
import printOperationNodeForField from '@/utils/printOperationNodeForField'
import { FetchDirectiveArg } from '@/utils/interface'
import { fillOneKeyMessageSignSuccess, MessageEnum } from '@/config/postMessage'
import {
  formatOperationDefAst,
  formatWorkspaceOperationDefsAst,
  getOperationDefsAstKeys,
  OperationForFiledNodeAstType,
  resolveOperationDefsTreeAstData,
} from '@/utils/formatOperationDefAst'
import { defaultLocalTypeDefs } from '@/config/const'
import { OperationNodesForFieldAstBySchemaReturnType } from '@/utils-copy/operations'
import { NewFieldNodeType } from '@/utils-copy/interface'
import { resolveOperationDefsForFieldNodeTree } from '@/utils-copy/resolveOperationDefsForFieldNodeTree'
import { dependOnSelectedAndKeyFieldAst, dependOnWorkspaceFieldKeysToFieldAstTree, getFieldNodeAstCheckedIsTrueKeys } from '@/utils-copy/dependOnSelectedAndKeyFieldAst'
import { getWorkspaceOperationsExistFieldKeys } from '@/utils-copy/workspaceOperationsAction'
import { printOneOperation } from '@/utils-copy/printBatchOperations'
import { buildOperationNodeForField } from '@/utils-copy/buildOperationNodeForField'

interface IProps {
  operationObj: OperationNodesForFieldAstBySchemaReturnType[number]
}

export type ArgColumnRecord = {
  key: string
  name: ArgTypeDef['name']
  type: ArgTypeDef['type']['name']
  defaultValue: ArgTypeDef['defaultValue']
  description: ArgTypeDef['description']
  deprecationReason?: ArgTypeDef['deprecationReason']
  children: ArgColumnRecord[] | null
  directives?: ConstDirectiveNode[]
}

enum SwitchToggleEnum {
  EDITOR,
  TABLE,
  DIFF,
}

const getArgsTreeData = (args: ArgTypeDef[], keyPrefix = '') => {
  const result: ArgColumnRecord[] = args.map(({ type, ...originData }) => {
    const key = `${keyPrefix}${originData.name}`
    let children: ArgColumnRecord['children'] = []
    switch (type.kind) {
      case 'Scalar':
        children = null
        break
      case 'InputObject':
        children = getArgsTreeData(type.fields, key)
        break
      case 'Enum':
        children = type.values.map((item) => ({
          key: key + item.value,
          name: item.name,
          type: '',
          defaultValue: item.value,
          description: item.description,
          deprecationReason: item.deprecationReason,
          children: null,
        }))
        break
    }
    return {
      ...originData,
      key,
      type: type.name,
      children,
    }
  })
  return result
}

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

const argsColumns: ColumnsType<ArgColumnRecord> = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: '35%',
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: '25%',
  },
  {
    title: 'Required',
    dataIndex: 'type',
    width: '20%',
    render(val: string) {
      let result = !val?.endsWith('!')
      result = !!val?.endsWith('!')
      if (result === true) {
        return (
          <Tag style={{ borderRadius: 4 }} color="success">
            True
          </Tag>
        )
      }
      return (
        <Tag style={{ borderRadius: 4 }} color="error">
          False
        </Tag>
      )
    },
  },
  {
    title: 'Type',
    dataIndex: 'type',
    width: '20%',
    render(value: string) {
      return value?.endsWith('!') ? value.slice(0, value.length - 1) : value
    },
  },
]

const fieldsColumns: ColumnsType<NewFieldNodeType> = [
  {
    title: 'Name',
    dataIndex: 'nameValue',
    width: '35%',
  },
  {
    title: 'Description',
    dataIndex: 'description',
    width: '25%',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    width: '20%',
  },
]

const OperationDoc: FC<IProps> = ({ operationObj }) => {
  const operationName = operationObj.operationDefNodeAst.name!.value
  const operationType = operationObj.operationDefNodeAst.operation
  // 远程得到的operation第一层的 selectionSet.selections 始终都只会存在数组长度为1，因为这是我转换schema对象转好operation ast函数里写的就是这样
  const fieldNodeAstTreeTmp = resolveOperationDefsForFieldNodeTree(operationObj.operationDefNodeAst.selectionSet.selections[0] as NewFieldNodeType)

  const { isDisplaySidebar, setState, workspaceGqlFileInfo, localTypeDefs } = useBearStore((ste) => ste)
  const [mode, setMode] = useState<SwitchToggleEnum>(SwitchToggleEnum.TABLE)
  const [spinIcon, setSpinIcon] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [fieldNodeAstTree, setFieldNodeAstTree] = useState<NewFieldNodeType>(fieldNodeAstTreeTmp)

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operationObj?.args)
  }, [operationObj?.args])

  const workspaceSchema = useMemo(() => {
    let localSchema: GraphQLSchema | undefined
    try {
      localSchema = buildSchema(localTypeDefs || defaultLocalTypeDefs)
    } catch (error) {
      message.error(`${error}`)
    }

    return localSchema!
  }, [localTypeDefs])

  const workspaceOperationStr = useMemo(() => {
    let operation
    try {
      operation = printOneOperation(
        buildOperationNodeForField({
          schema: workspaceSchema,
          kind: operationObj?.operationDefNodeAst?.operation,
          field: operationObj?.operationDefNodeAst?.name!.value,
        }),
      )
    } catch {
      operation = 'null...'
    }

    return operation
  }, [operationObj?.operationDefNodeAst?.name, operationObj?.operationDefNodeAst?.operation, workspaceSchema])

  const remoteOperationStr = useMemo(() => {
    return printOneOperation(operationObj.operationDefNodeAst)
  }, [operationObj.operationDefNodeAst])

  // 一键填入事件
  const handleOneKeyFillEvent = useCallback(() => {
    // setSpinIcon(true)
    // // 向插件发送信息
    // vscode.postMessage({
    //   typeDefs,
    //   type: MessageEnum.ONE_KEY_FILL,
    //   gqlStr: printOperationStr(operationDefsAstTree!),
    //   gqlName: operation.name,
    //   gqlType: operation.operationType,
    // })
    // // 接受插件发送过来的信息
    // window.addEventListener('message', listener)
    // function listener(evt: any) {
    //   const data = evt.data as string
    //   if (data === fillOneKeyMessageSignSuccess) {
    //     message.success('一键填入成功')
    //     setSpinIcon(false)
    //   }
    //   setSpinIcon(false)
    //   window.removeEventListener('message', listener)
    // }
  }, [])

  useLayoutEffect(() => {
    let resultKeys = [] as string[]
    const operationName = operationObj.operationDefNodeAst.name!.value
    const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item) => item.operationNames.includes(operationName))

    // 这个接口在工作区存在于多个文件夹，这种情况我不管它
    if (filtrationWorkspaceGqlFileInfo?.length >= 2) {
      resultKeys = []
    } else if (filtrationWorkspaceGqlFileInfo?.length === 1) {
      const operationDefinitionNodes = filtrationWorkspaceGqlFileInfo[0]?.operationsAsts as OperationDefinitionNode[]
      let operationNameFieldNode: FieldNode | undefined
      operationDefinitionNodes?.forEach((operationNode) => {
        const sameOperationNameFieldNode = (operationNode.selectionSet.selections as FieldNode[])?.find((itm) => itm.name.value === operationName)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceGqlFileInfo])

  return (
    <Space id={operationName} className={styles.operationDoc} direction="vertical">
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
            <Space
              id="copy"
              // data-clipboard-text={printOperationStr(operationDefsAstTree!)}
              className={styles.copyBtn}
              onClick={() => {
                copy('#copy')
              }}
            >
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
      <>
        {!!argsTreeData.length && (
          <>
            <Divider className={styles.divider} />
            <div className={styles.paramsText}>Params: </div>
            {mode === SwitchToggleEnum.TABLE && (
              <Table size="small" indentSize={21} columns={argsColumns} defaultExpandAllRows className={styles.table} dataSource={argsTreeData} pagination={false} bordered />
            )}
            {/* {mode === SwitchToggleEnum.EDITOR && <AceEditor theme="tomorrow" mode="javascript" width="100%" readOnly maxLines={Infinity} value={obj2str(operationObj.args)} />} */}
            {/* {mode === SwitchToggleEnum.DIFF && (
              <ReactDiffViewer
                oldValue={localOperation ? obj2str(localOperation.argsExample) : 'nothings...'}
                newValue={obj2str(operation.argsExample)}
                splitView={true}
                compareMethod={DiffMethod.SENTENCES}
                showDiffOnly={false}
                hideLineNumbers
                leftTitle="Old-Diff"
                rightTitle="New-Diff"
                renderContent={(codeStr) => {
                  return <div className={styles.diff_viewer_div}>{codeStr}</div>
                }}
              />
            )} */}
          </>
        )}
        <>
          <div>Response: </div>
          {mode === SwitchToggleEnum.TABLE && (
            <Table
              size="small"
              rowKey="fieldKey"
              rowSelection={{
                selectedRowKeys: selectedKeys,
                hideSelectAll: true,
                onSelect: (record, selected) => {
                  const key = record.fieldKey
                  const newFieldNodeAstTree = dependOnSelectedAndKeyFieldAst(fieldNodeAstTree, selected, key)
                  const keys = getFieldNodeAstCheckedIsTrueKeys(newFieldNodeAstTree)
                  setFieldNodeAstTree(newFieldNodeAstTree)
                  setSelectedKeys(keys)
                },
              }}
              columns={fieldsColumns}
              className={styles.table}
              dataSource={[fieldNodeAstTree]}
              pagination={false}
              defaultExpandAllRows
              bordered
              indentSize={21}
            />
          )}
          {mode === SwitchToggleEnum.EDITOR && (
            <AceEditor
              theme="textmate"
              mode="javascript"
              width="100%"
              fontSize={13}
              showPrintMargin={true}
              showGutter={true}
              highlightActiveLine={true}
              name={`${operationName}_${operationType}`}
              maxLines={Infinity}
              value={remoteOperationStr}
              setOptions={{
                theme: 'textmate',
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: true,
                showLineNumbers: true,
                tabSize: 2,
              }}
            />
          )}
          {mode === SwitchToggleEnum.DIFF && (
            <ReactDiffViewer
              oldValue={workspaceOperationStr}
              newValue={remoteOperationStr}
              splitView={true}
              compareMethod={DiffMethod.SENTENCES}
              showDiffOnly={false}
              hideLineNumbers
              leftTitle="Old-Diff"
              rightTitle="New-Diff"
              renderContent={(codeStr) => {
                return <div className={styles.diff_viewer_div}>{codeStr}</div>
              }}
            />
          )}
        </>
      </>
    </Space>
  )
}

export default OperationDoc
