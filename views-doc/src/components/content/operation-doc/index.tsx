import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import {
  buildSchema,
  ConstDirectiveNode,
  FieldNode,
  GraphQLArgument,
  GraphQLSchema,
  OperationDefinitionNode,
} from 'graphql'
import { message, Space, Table, Tooltip, Switch, Divider, Tag, Button, Modal, Select, Form } from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer'
import AceEditor from 'react-ace'
import obj2str from 'stringify-object'
import { CopyOutlined, LoadingOutlined, MenuFoldOutlined, EditOutlined } from '@ant-design/icons'
import ClipboardJS from 'clipboard'
import styles from './index.module.less'
import useBearStore from '@/stores'

import { defaultLocalTypeDefs } from '@/config/const'
import {
  genArgsExample,
  OperationDefinitionNodeGroupType,
  OperationNodesForFieldAstBySchemaReturnType,
} from '@/utils/operations'
import { InputType, NewFieldNodeType } from '@/utils/interface'
import {
  resolveOperationDefsForFieldNodeTree,
  getOperationDefsForFieldNodeTreeDepthKeys,
} from '@/utils/resolveOperationDefsForFieldNodeTree'
import {
  dependOnSelectedAndKeyFieldAst,
  dependOnWorkspaceFieldKeysToFieldAstTree,
  getFieldNodeAstCheckedIsTrueKeys,
} from '@/utils/dependOnSelectedAndKeyFieldAst'
import { getWorkspaceOperationsExistFieldKeys } from '@/utils/getWorkspaceOperationsExistFieldKeys'
import { printOneOperation } from '@/utils/printBatchOperations'
import { buildOperationNodeForField } from '@/utils/buildOperationNodeForField'
import { relyOnKeysPrintOperation } from '@/utils/relyOnKeysPrintOperation'
import { GetWorkspaceGqlFileInfoReturnType } from '@/utils/syncWorkspaceGqls'

interface IProps {
  operationObj: OperationNodesForFieldAstBySchemaReturnType[number]
}
interface ArgTypeDef extends Pick<GraphQLArgument, 'name' | 'description' | 'defaultValue' | 'deprecationReason'> {
  type: InputType
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
    width: '30%',
  },
  {
    title: 'Description',
    dataIndex: 'descriptionText',
    width: '35%',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    width: '30%',
  },
]

const OperationDoc: FC<IProps> = ({ operationObj }) => {
  const operationDefNode = operationObj.operationDefNodeAst
  const operationName = operationDefNode.name!.value
  const operationType = operationDefNode.operation
  // 远程得到的operation第一层的 selectionSet.selections 始终都只会存在数组长度为1，因为这是我转换schema对象转好operation ast函数里写的就是这样
  const fieldNodeAstTreeTmp = resolveOperationDefsForFieldNodeTree(
    operationDefNode.selectionSet.selections[0] as NewFieldNodeType,
  )

  const { isDisplaySidebar, setState, workspaceGqlFileInfo, localTypeDefs, isAllAddComment, maxDepth } = useBearStore(
    (ste) => ste,
  )
  const [mode, setMode] = useState<SwitchToggleEnum>(SwitchToggleEnum.TABLE)
  const [spinIcon, setSpinIcon] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [fieldNodeAstTree, setFieldNodeAstTree] = useState<NewFieldNodeType>(fieldNodeAstTreeTmp)
  const defaultExpandedRowKeys = getOperationDefsForFieldNodeTreeDepthKeys(fieldNodeAstTreeTmp, maxDepth)

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operationDefNode.args)
  }, [operationDefNode.args])

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
        isAllAddComment,
      )
    } catch {
      operation = 'null...'
    }

    return operation
  }, [
    isAllAddComment,
    operationObj?.operationDefNodeAst?.name,
    operationObj?.operationDefNodeAst?.operation,
    workspaceSchema,
  ])

  const remoteOperationStr = useMemo(() => {
    return printOneOperation(operationDefNode, isAllAddComment)
  }, [isAllAddComment, operationDefNode])

  const workspaceOperationArgsStr = useMemo(() => {
    let workspaceOperationDefAst: OperationDefinitionNodeGroupType | undefined
    try {
      workspaceOperationDefAst = buildOperationNodeForField({
        schema: workspaceSchema,
        kind: operationObj?.operationDefNodeAst?.operation,
        field: operationObj?.operationDefNodeAst?.name!.value,
      })
    } catch {
      workspaceOperationDefAst = undefined
    }

    return obj2str(genArgsExample(workspaceOperationDefAst?.args || []))
  }, [operationObj?.operationDefNodeAst?.name, operationObj?.operationDefNodeAst?.operation, workspaceSchema])

  const remoteOperationArgsStr = useMemo(() => {
    return obj2str(genArgsExample(operationDefNode.args))
  }, [operationDefNode.args])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceGqlFileInfo])

  const [form] = Form.useForm()
  const onOk = useCallback(() => {
    form.validateFields().then(async (res) => {
      let operationStr: string | undefined
      try {
        operationStr = await relyOnKeysPrintOperation(operationDefNode, selectedKeys, isAllAddComment)
      } catch (error) {
        message.error(error)
      }

      if (operationStr) {
        const { filenameList } = res
        const info = filteredWorkspaceGqlFileInfo.filter((itm) => filenameList.includes(itm.filename))

        // TODO: 查看参数 多少kb
        // const json = JSON.stringify({ info, gql: operationStr })
        // const byteSize = new Blob([json]).size
        // const sizeInKB = byteSize / 1024
        // console.log(`请求参数大小：${sizeInKB.toFixed(2)} KB`)

        fetch('/multiple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ info, gql: operationStr }),
        })
          .then((response) => response.json())
          .then((data) => {
            message.success(data.message)
          })
          .catch((error) => {
            message.error(error.message)
          })
          .finally(() => {
            setIsModalOpen(false)
          })
      }
    })
  }, [filteredWorkspaceGqlFileInfo, form, isAllAddComment, operationDefNode, selectedKeys])

  return (
    <Space id={operationName} className={styles.operationDoc} direction="vertical">
      <Modal
        title="Basic Modal"
        open={isModalOpen}
        onOk={onOk}
        onCancel={() => {
          setIsModalOpen(false)
        }}
      >
        <Form form={form}>
          <Form.Item name="filenameList" rules={[{ message: '请选择路径', required: true }]}>
            <Select
              mode="tags"
              options={
                filteredWorkspaceGqlFileInfo?.map((val) => ({
                  value: val.filename,
                  label: val.filename,
                })) || []
              }
              placeholder="请选择一键填入路径"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
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
      <>
        {!!argsTreeData.length && (
          <>
            <Divider className={styles.divider} />
            <div className={styles.paramsText}>Params: </div>
            {mode === SwitchToggleEnum.TABLE && (
              <Table
                size="small"
                indentSize={21}
                columns={argsColumns}
                defaultExpandAllRows
                className={styles.table}
                dataSource={argsTreeData}
                pagination={false}
                bordered
              />
            )}
            {mode === SwitchToggleEnum.EDITOR && (
              <AceEditor
                theme="tomorrow"
                mode="javascript"
                width="100%"
                readOnly
                maxLines={Infinity}
                value={remoteOperationArgsStr}
              />
            )}
            {mode === SwitchToggleEnum.DIFF && (
              <ReactDiffViewer
                oldValue={workspaceOperationArgsStr}
                newValue={remoteOperationArgsStr}
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
              defaultExpandedRowKeys={defaultExpandedRowKeys}
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
