import { Divider, Table, Tag } from 'antd'
import React, { useMemo } from 'react'

import useBearStore from '@/stores'
import {
  dependOnSelectedAndKeyFieldAst,
  getFieldNodeAstCheckedIsTrueKeys,
} from '@/utils/dependOnSelectedAndKeyFieldAst'
import type { OperationDefsForFieldNodeTreeReturnType } from '@/utils/resolveOperationDefsForFieldNodeTree'
import { getOperationDefsForFieldNodeTreeDepthKeys } from '@/utils/resolveOperationDefsForFieldNodeTree'

import styles from './index.module.less'

import type {
  ArgTypeDef,
  NewFieldNodeType,
  OperationDefinitionNodeGroupType,
} from '@fruits-chain/qiufen-pro-helpers'
import type { ColumnsType } from 'antd/es/table'
import type { ConstDirectiveNode } from 'graphql'
import type { FC } from 'react'

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
        children = type.values.map(item => ({
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
  const { maxDepth } = useBearStore(ste => ste)

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operationDefNode.args)
  }, [operationDefNode.args])

  const defaultExpandedRowKeys = getOperationDefsForFieldNodeTreeDepthKeys(
    fieldNodeAstTreeTmp,
    maxDepth,
  )

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
              if (record?.halfChecked && !record?.checked) {
                // 这里只能这样做才能渲染正常
                return {
                  // @ts-ignore
                  ...originNode,
                  props: {
                    // @ts-ignore
                    ...originNode.props,
                    indeterminate: record?.halfChecked,
                    checked: record?.checked,
                  },
                }
              }
              return originNode
            },
            selectedRowKeys: selectedKeys,
            hideSelectAll: true,
            onSelect: (record, selected) => {
              const key = record.fieldKey
              const newFieldNodeAstTree = dependOnSelectedAndKeyFieldAst(
                fieldNodeAstTree,
                selected,
                key,
              )
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
          indentSize={31}
        />
      )}
    </>
  )
}

export default FieldTable
