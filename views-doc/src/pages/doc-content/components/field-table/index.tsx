import { Divider, Table, Tag } from 'antd'
import { ColumnsType } from 'antd/es/table'
import React, { FC, useMemo } from 'react'
import { ArgTypeDef, NewFieldNodeType } from '@/utils/interface'
import { OperationDefinitionNodeGroupType } from '@/utils/operations'
import styles from './index.module.less'
import { ConstDirectiveNode } from 'graphql'
import {
  dependOnSelectedAndKeyFieldAst,
  getFieldNodeAstCheckedIsTrueKeys,
} from '@/utils/dependOnSelectedAndKeyFieldAst'
import {
  OperationDefsForFieldNodeTreeReturnType,
  getOperationDefsForFieldNodeTreeDepthKeys,
} from '@/utils/resolveOperationDefsForFieldNodeTree'
import useBearStore from '@/stores'

interface IProps {
  isShow: boolean
  operationDefNode: OperationDefinitionNodeGroupType
  selectedKeys: string[]
  setFieldNodeAstTree: (val: NewFieldNodeType) => void
  setSelectedKeys: (val: string[]) => void
  fieldNodeAstTree: NewFieldNodeType
  fieldNodeAstTreeTmp: OperationDefsForFieldNodeTreeReturnType
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

const FieldTable: FC<IProps> = ({
  isShow,
  operationDefNode,
  fieldNodeAstTree,
  selectedKeys,
  setFieldNodeAstTree,
  setSelectedKeys,
  fieldNodeAstTreeTmp,
}) => {
  const { maxDepth } = useBearStore((ste) => ste)

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operationDefNode.args)
  }, [operationDefNode.args])

  const defaultExpandedRowKeys = getOperationDefsForFieldNodeTreeDepthKeys(fieldNodeAstTreeTmp, maxDepth)

  return (
    <>
      {!!argsTreeData.length && (
        <div style={{ marginBottom: 12 }}>
          <Divider className={styles.divider} />
          <div className={styles.paramsText}>Params: </div>
          {isShow && (
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
        </div>
      )}
      <div className={styles.paramsText}>Response: </div>
      {isShow && (
        <Table
          size="small"
          rowKey="fieldKey"
          rowSelection={{
            renderCell: (checked, record, index, originNode) => {
              return originNode
            },
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
    </>
  )
}

export default FieldTable
