import { Form, Modal, Select, message } from 'antd'
import React, { memo, useCallback } from 'react'

import useBearStore from '@/stores'
import type { OperationDefinitionNodeGroupType } from '@/utils/operations'
import { relyOnKeysPrintOperation } from '@/utils/relyOnKeysPrintOperation'

import type { GetWorkspaceGqlFileInfoReturnType } from '../operation-doc'
import type { FC } from 'react'

interface IProps {
  isModalOpen: boolean
  onCancel: () => void
  operationDefNode: OperationDefinitionNodeGroupType
  filteredWorkspaceGqlFileInfo: GetWorkspaceGqlFileInfoReturnType[]
  selectedKeys: string[]
}

const InSetModal: FC<IProps> = ({
  filteredWorkspaceGqlFileInfo,
  operationDefNode,
  selectedKeys,
  isModalOpen,
  onCancel,
}) => {
  const { isAllAddComment } = useBearStore(ste => ste)

  const [form] = Form.useForm()

  const onOk = useCallback(() => {
    form.validateFields().then(async res => {
      let operationStr: string | undefined
      try {
        operationStr = await relyOnKeysPrintOperation(
          operationDefNode,
          selectedKeys,
          isAllAddComment,
        )
      } catch (error) {
        message.error(error)
      }

      if (operationStr) {
        const { filenameList } = res
        const info = filteredWorkspaceGqlFileInfo.filter(itm =>
          filenameList.includes(itm.filename),
        )

        // TODO: 查看参数 多少kb
        // const json = JSON.stringify({ info, gql: operationStr })
        // const byteSize = new Blob([json]).size
        // const sizeInKB = byteSize / 1024
        // console.log(`请求参数大小：${sizeInKB.toFixed(2)} KB`)

        fetch('http://localhost:4100/multiple', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ info, gql: operationStr }),
        })
          .then(response => response.json())
          .then(data => {
            message.success(data.message)
          })
          .catch(error => {
            message.error(error.message)
          })
          .finally(() => {
            onCancel()
          })
      }
    })
  }, [
    filteredWorkspaceGqlFileInfo,
    form,
    isAllAddComment,
    onCancel,
    operationDefNode,
    selectedKeys,
  ])

  return (
    <Modal title="路径选择" open={isModalOpen} onOk={onOk} onCancel={onCancel}>
      <Form form={form}>
        <Form.Item
          name="filenameList"
          rules={[{ message: '请选择路径', required: true }]}>
          <Select
            mode="tags"
            options={
              filteredWorkspaceGqlFileInfo?.map(val => ({
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
  )
}

export default memo(InSetModal)
