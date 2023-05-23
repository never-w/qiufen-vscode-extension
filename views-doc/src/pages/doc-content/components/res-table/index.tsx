import {
  dependOnSelectedAndKeyFieldAst,
  getFieldNodeAstCheckedIsTrueKeys,
} from '@/utils/dependOnSelectedAndKeyFieldAst'
import { NewFieldNodeType } from '@/utils/interface'
import { Table, message } from 'antd'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer'
import AceEditor from 'react-ace'
import { ColumnsType } from 'antd/es/table'
import React, { FC, memo, useMemo } from 'react'
import styles from './index.module.less'
import { printOneOperation } from '@/utils/printBatchOperations'
import useBearStore from '@/stores'
import { buildOperationNodeForField } from '@/utils/buildOperationNodeForField'
import { GraphQLSchema, buildSchema } from 'graphql'
import { defaultLocalTypeDefs } from '@/config/const'
import { OperationDefinitionNodeGroupType } from '@/utils/operations'
import {
  OperationDefsForFieldNodeTreeReturnType,
  getOperationDefsForFieldNodeTreeDepthKeys,
} from '@/utils/resolveOperationDefsForFieldNodeTree'

export enum SwitchToggleEnum {
  EDITOR,
  TABLE,
  DIFF,
}

interface IProps {
  setFieldNodeAstTree: (val: NewFieldNodeType) => void
  setSelectedKeys: (val: string[]) => void
  fieldNodeAstTree: NewFieldNodeType
  operationDefNode: OperationDefinitionNodeGroupType
  selectedKeys: string[]
  fieldNodeAstTreeTmp: OperationDefsForFieldNodeTreeReturnType
  mode: SwitchToggleEnum
  operationDefNodeAst: OperationDefinitionNodeGroupType
}

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

const ResTable: FC<IProps> = ({
  mode,
  fieldNodeAstTreeTmp,
  operationDefNode,
  operationDefNodeAst,
  selectedKeys,
  fieldNodeAstTree,
  setSelectedKeys,
  setFieldNodeAstTree,
}) => {
  const { isAllAddComment, localTypeDefs, maxDepth } = useBearStore((ste) => ste)

  const defaultExpandedRowKeys = getOperationDefsForFieldNodeTreeDepthKeys(fieldNodeAstTreeTmp, maxDepth)

  const workspaceSchema = useMemo(() => {
    let localSchema: GraphQLSchema | undefined
    try {
      localSchema = buildSchema(localTypeDefs || defaultLocalTypeDefs)
    } catch (error) {
      message.error(`${error}`)
    }

    return localSchema!
  }, [localTypeDefs])

  const operationName = operationDefNode.name!.value
  const operationType = operationDefNode.operation

  const workspaceOperationStr = useMemo(() => {
    let operation
    try {
      operation = printOneOperation(
        buildOperationNodeForField({
          schema: workspaceSchema,
          kind: operationDefNodeAst?.operation,
          field: operationDefNodeAst?.name!.value,
        }),
        isAllAddComment,
      )
    } catch {
      operation = 'null...'
    }

    return operation
  }, [isAllAddComment, operationDefNodeAst?.name, operationDefNodeAst?.operation, workspaceSchema])

  const remoteOperationStr = useMemo(() => {
    return printOneOperation(operationDefNode, isAllAddComment)
  }, [isAllAddComment, operationDefNode])

  return (
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
  )
}

export default memo(ResTable)
