import { Divider, message } from 'antd'
import React, { FC, useMemo } from 'react'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer'
import { SwitchToggleEnum } from '../operation-doc'
import useBearStore from '@/stores'
import { GraphQLSchema, buildSchema } from 'graphql'
import { defaultLocalTypeDefs } from '@/config/const'
import { OperationDefinitionNodeGroupType, genArgsExample } from '@/utils/operations'
import { buildOperationNodeForField } from '@/utils/buildOperationNodeForField'
import obj2str from 'stringify-object'
import { printOneOperation } from '@/utils/printBatchOperations'
import styles from './index.module.less'

interface IProps {
  mode: SwitchToggleEnum
  operationDefNode: OperationDefinitionNodeGroupType
}

const DiffViewer: FC<IProps> = ({ mode, operationDefNode }) => {
  const { localTypeDefs, isAllAddComment } = useBearStore((ste) => ste)

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
        kind: operationDefNode?.operation,
        field: operationDefNode?.name!.value,
      })
    } catch {
      workspaceOperationDefAst = undefined
    }

    return obj2str(genArgsExample(workspaceOperationDefAst?.args || []))
  }, [operationDefNode?.name, operationDefNode?.operation, workspaceSchema])

  const remoteOperationArgsStr = useMemo(() => {
    return obj2str(genArgsExample(operationDefNode.args))
  }, [operationDefNode.args])

  const workspaceOperationStr = useMemo(() => {
    let operation
    try {
      operation = printOneOperation(
        buildOperationNodeForField({
          schema: workspaceSchema,
          kind: operationDefNode?.operation,
          field: operationDefNode?.name!.value,
        }),
        isAllAddComment,
      )
    } catch {
      operation = 'null...'
    }

    return operation
  }, [isAllAddComment, operationDefNode?.name, operationDefNode?.operation, workspaceSchema])

  const remoteOperationStr = useMemo(() => {
    return printOneOperation(operationDefNode, isAllAddComment)
  }, [isAllAddComment, operationDefNode])

  return (
    <div>
      <>
        <Divider className={styles.divider} />
        <div className={styles.paramsText}>Params: </div>
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
      <div>Response: </div>
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
    </div>
  )
}

export default DiffViewer
