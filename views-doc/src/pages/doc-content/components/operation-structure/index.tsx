import React, { FC, useMemo } from 'react'
import AceEditor from 'react-ace'
import obj2str from 'stringify-object'
import styles from './index.module.less'
import { OperationDefinitionNodeGroupType, genArgsExample } from '@/utils/operations'
import useBearStore from '@/stores'
import { printOneOperation } from '@/utils/printBatchOperations'

interface IProps {
  isShow: boolean
  operationDefNode: OperationDefinitionNodeGroupType
}

const OperationStructure: FC<IProps> = ({ isShow, operationDefNode }) => {
  const { isAllAddComment } = useBearStore((ste) => ste)

  const remoteOperationArgsStr = useMemo(() => {
    return obj2str(genArgsExample(operationDefNode.args))
  }, [operationDefNode.args])

  const remoteOperationStr = useMemo(() => {
    return printOneOperation(operationDefNode, isAllAddComment)
  }, [isAllAddComment, operationDefNode])

  const operationName = operationDefNode.name!.value
  const operationType = operationDefNode.operation

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div className={styles.paramsText}>Params: </div>
        {isShow && (
          <AceEditor
            theme="tomorrow"
            mode="javascript"
            width="100%"
            readOnly
            maxLines={Infinity}
            value={remoteOperationArgsStr}
          />
        )}
      </div>
      <>
        <div className={styles.paramsText}>Response: </div>
        {isShow && (
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
      </>
    </>
  )
}

export default OperationStructure
