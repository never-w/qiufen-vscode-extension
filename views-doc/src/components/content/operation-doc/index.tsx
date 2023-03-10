import React, { useMemo, useRef } from 'react'
import { message, Space, Table, Tooltip, Switch, Divider, Tag, Button } from 'antd'
import { CopyOutlined, MenuFoldOutlined } from '@ant-design/icons'
import ClipboardJS from 'clipboard'
import { genGQLStr } from '@fruits-chain/qiufen-helpers'
import { useToggle, useUpdate } from '@fruits-chain/hooks-laba'
import AceEditor from 'react-ace'
import obj2str from 'stringify-object'
import styles from './index.module.less'
import type { TypedOperation, ArgTypeDef, ObjectFieldTypeDef } from '@fruits-chain/qiufen-helpers'
import type { ColumnsType } from 'antd/lib/table'
import type { FC } from 'react'
import useBearStore from '@/stores'
import { ArgumentNode, buildSchema, ConstDirectiveNode, StringValueNode } from 'graphql'
import { getDefaultRowKeys, traverseOperationTreeGetParentAndChildSelectedKeys } from '@/utils/traverseTree'
import { printGqlOperation } from '@/utils/visitOperationTransformer'

enum FetchDirectiveArg {
  LOADER = 'loader',
  FETCH = 'fetch',
}

interface IProps {
  operation: TypedOperation
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

const getObjectFieldsTreeData = (objectFields: ObjectFieldTypeDef[], keyPrefix = '') => {
  const result: ArgColumnRecord[] = objectFields.map(({ output, ...originData }) => {
    const key = `${keyPrefix}${originData.name}`
    let children: ArgColumnRecord['children'] = []
    switch (output.kind) {
      case 'Scalar':
        children = []
        break
      case 'Object':
        children = getObjectFieldsTreeData(output.fields, key)
        break
      case 'Enum':
        children = output.values.map((item) => ({
          key: key + item.value,
          name: item.name,
          type: '',
          defaultValue: item.value,
          description: item.description,
          deprecationReason: item.deprecationReason,
          children: null,
        }))
        break
      case 'Union':
        output.types.forEach((type) => {
          children = [...(children || []), ...getObjectFieldsTreeData(type.fields, key)]
        })
    }
    return {
      ...originData,
      key,
      defaultValue: null,
      type: output.name,
      children: children.length > 0 ? children : null,
    }
  })
  return result
}

const columnGen = (field: 'arguments' | 'return'): ColumnsType<ArgColumnRecord> => {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      width: '35%',
      render(value, record) {
        const tmpIsDirective = !!record.directives?.find((itm) => itm.name.value === 'fetchField')
        const directivesArgs = record.directives?.find((itm) => itm.name.value === 'fetchField')
          ?.arguments as ArgumentNode[]
        const firstArgValue = (directivesArgs?.[0]?.value as StringValueNode)?.value

        const isYellow = FetchDirectiveArg.LOADER === firstArgValue
        const colorStyle: React.CSSProperties | undefined = tmpIsDirective
          ? { color: isYellow ? '#FF9900' : 'red' }
          : undefined

        const deprecationReason = record.deprecationReason
        if (deprecationReason) {
          return (
            <span className={styles.deprecated} style={colorStyle}>
              {value}
            </span>
          )
        }
        return <span style={colorStyle}>{value}</span>
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      width: '25%',
      render(val, record) {
        const deprecationReason = record.deprecationReason
        if (deprecationReason) {
          return (
            <>
              {val}
              <span className={styles.warning}>{deprecationReason}</span>
            </>
          )
        }
        return val
      },
    },
    {
      title: field === 'arguments' ? 'Required' : 'Nullable',
      dataIndex: 'type',
      width: '20%',
      render(val: string) {
        let result = !val?.endsWith('!')
        if (field === 'arguments') {
          result = !!val?.endsWith('!')
        }
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

const OperationDoc: FC<IProps> = ({ operation }) => {
  const { isDisplaySidebar, setState, directive, backendTypeDefs } = useBearStore((ste: any) => ste)
  const [mode, { toggle: toggleMode }] = useToggle<'TABLE', 'EDITOR'>('TABLE', 'EDITOR')
  const selectedRowKeys = useRef<string[] | null>(null)
  const update = useUpdate()

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operation.args)
  }, [operation.args])
  const argsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen('arguments')
  }, [operation])

  const objectFieldsTreeData = useMemo(() => {
    return getObjectFieldsTreeData([operation])
  }, [operation])
  const objectFieldsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen('return')
  }, [operation])

  const gqlStr = useMemo(() => {
    return genGQLStr(operation)
  }, [operation])

  const defaultSelectedRowKeys = useMemo(() => {
    const keys: string[] = []
    getDefaultRowKeys(objectFieldsTreeData, keys, directive)
    return keys
  }, [directive, objectFieldsTreeData])

  // 获取初始化页面默认值时选择的operation filed
  const defaultSelectedKeys = useMemo(() => {
    const tmpSelectedKeys: string[] = []
    objectFieldsTreeData.forEach((node) => {
      traverseOperationTreeGetParentAndChildSelectedKeys(node, defaultSelectedRowKeys, [], tmpSelectedKeys)
    })
    // 去重
    const resultUniqKeys = [...new Set(tmpSelectedKeys)]
    return resultUniqKeys
  }, [defaultSelectedRowKeys, objectFieldsTreeData])

  return (
    <Space id={operation.name} className={styles.operationDoc} direction="vertical">
      <div className={styles.name}>
        <Space size={40}>
          <span>
            Operation name:
            <span className={styles.operationName}>{` ${operation.name}`}</span>
          </span>
          <span>
            Operation type:
            <span className={styles.operationName}>{` ${operation.operationType}`}</span>
          </span>
        </Space>
        <Space size={88}>
          <Tooltip title="Hide Sidebar">
            <Button
              type="text"
              onClick={() => {
                setState({ isDisplaySidebar: !isDisplaySidebar })
              }}
            >
              <Space id="sidebar" data-clipboard-text={gqlStr} className={styles.copyBtn}>
                <MenuFoldOutlined />
                <span className={styles.text}>Hide Sidebar</span>
              </Space>
            </Button>
          </Tooltip>
          <Tooltip title="Copy GQL">
            <Space
              id="copy"
              data-clipboard-text={printGqlOperation(
                buildSchema(backendTypeDefs),
                operation,
                !selectedRowKeys.current ? defaultSelectedKeys : selectedRowKeys.current,
              )}
              className={styles.copyBtn}
              onClick={() => {
                update()
                copy('#copy')
              }}
            >
              <CopyOutlined />
              <span className={styles.text}>Copy GQL</span>
            </Space>
          </Tooltip>
          <Switch
            size="default"
            checked={mode === 'EDITOR'}
            checkedChildren="editor"
            unCheckedChildren="table"
            onChange={() => {
              toggleMode()
            }}
          />
        </Space>
      </div>
      {!!argsTreeData.length && (
        <>
          <Divider className={styles.divider} />
          <div className={styles.paramsText}>Params: </div>
          <div style={{ display: mode === 'TABLE' ? 'block' : 'none' }}>
            <Table
              columns={argsColumns}
              defaultExpandAllRows
              className={styles.table}
              dataSource={argsTreeData}
              pagination={false}
              bordered
            />
          </div>
          <div style={{ display: mode !== 'TABLE' ? 'block' : 'none' }}>
            <AceEditor
              theme="tomorrow"
              mode="javascript"
              width="100%"
              readOnly
              maxLines={Infinity}
              value={obj2str(operation.argsExample)}
            />
          </div>
        </>
      )}
      <div>Response: </div>
      <div style={{ display: mode === 'TABLE' ? 'block' : 'none' }}>
        <Table
          rowSelection={{
            defaultSelectedRowKeys,
            hideSelectAll: true,
            checkStrictly: false,
            onChange: (selectedKeys) => {
              const tmpSelectedKeys: string[] = []
              objectFieldsTreeData.forEach((node) => {
                traverseOperationTreeGetParentAndChildSelectedKeys(node, selectedKeys as string[], [], tmpSelectedKeys)
              })
              // 去重
              const uniqTmpSelectedKeys = [...new Set(tmpSelectedKeys)]
              selectedRowKeys.current = uniqTmpSelectedKeys
            },
          }}
          columns={objectFieldsColumns}
          className={styles.table}
          dataSource={objectFieldsTreeData}
          pagination={false}
          defaultExpandedRowKeys={defaultSelectedKeys}
          bordered
        />
      </div>
      <div style={{ display: mode !== 'TABLE' ? 'block' : 'none' }}>
        <AceEditor
          theme="tomorrow"
          mode="javascript"
          width="100%"
          readOnly
          maxLines={Infinity}
          value={obj2str(operation.outputExample)}
          editorProps={{
            $blockScrolling: false,
          }}
        />
      </div>
    </Space>
  )
}

export default OperationDoc
