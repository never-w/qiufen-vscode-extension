import { Divider, Table, Tag, message } from 'antd'
import React, { FC, memo, useMemo } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer'
import AceEditor from 'react-ace'
import styles from './index.module.less'
import { SwitchToggleEnum } from '../res-table'
import { ColumnsType } from 'antd/es/table'
import { buildOperationNodeForField } from '@/utils/buildOperationNodeForField'
import { OperationDefinitionNodeGroupType, genArgsExample } from '@/utils/operations'
import obj2str from 'stringify-object'
import { ConstDirectiveNode, GraphQLSchema, buildSchema } from 'graphql'
import { defaultLocalTypeDefs } from '@/config/const'
import useBearStore from '@/stores'
import { ArgTypeDef } from '@/utils/interface'

interface IProps {
  operationDefNode: OperationDefinitionNodeGroupType
  operationDefNodeAst: OperationDefinitionNodeGroupType
  mode: SwitchToggleEnum
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

const ArgsTable: FC<IProps> = ({ mode, operationDefNode, operationDefNodeAst }) => {
  const { localTypeDefs } = useBearStore((ste) => ste)

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

  const workspaceOperationArgsStr = useMemo(() => {
    let workspaceOperationDefAst: OperationDefinitionNodeGroupType | undefined
    try {
      workspaceOperationDefAst = buildOperationNodeForField({
        schema: workspaceSchema,
        kind: operationDefNodeAst?.operation,
        field: operationDefNodeAst?.name!.value,
      })
    } catch {
      workspaceOperationDefAst = undefined
    }

    return obj2str(genArgsExample(workspaceOperationDefAst?.args || []))
  }, [operationDefNodeAst?.name, operationDefNodeAst?.operation, workspaceSchema])

  const remoteOperationArgsStr = useMemo(() => {
    return obj2str(genArgsExample(operationDefNode.args))
  }, [operationDefNode.args])

  return (
    <div>
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
    </div>
  )
}

export default memo(ArgsTable)
