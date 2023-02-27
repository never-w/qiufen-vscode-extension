import React, { useMemo, useState } from "react"
import type { FC } from "react"
import { buildSchema, GraphQLSchema, print } from "graphql"
import { message, Space, Table, Tooltip, Switch, Divider, Tag, Button } from "antd"
import type { ColumnsType } from "antd/lib/table"
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer"
import AceEditor from "react-ace"
import obj2str from "stringify-object"
import { CopyOutlined, PlayCircleOutlined, MenuFoldOutlined } from "@ant-design/icons"
import ClipboardJS from "clipboard"
import { genGQLStr } from "@fruits-chain/qiufen-helpers"
import styles from "./index.module.less"
import { getOperationsBySchema } from "@/utils/operation"
import type { TypedOperation, ArgTypeDef, ObjectFieldTypeDef } from "@fruits-chain/qiufen-helpers"
import useBearStore from "@/webview/stores"
import printOperationNodeForField from "@/utils/printOperationNodeForField"

interface IProps {
  operation: TypedOperation
}

type ArgColumnRecord = {
  key: string
  name: ArgTypeDef["name"]
  type: ArgTypeDef["type"]["name"]
  defaultValue: ArgTypeDef["defaultValue"]
  description: ArgTypeDef["description"]
  deprecationReason?: ArgTypeDef["deprecationReason"]
  children: ArgColumnRecord[] | null
}

type SwitchToggleType = "EDITOR" | "TABLE" | "DIFF"

enum SwitchToggleEnum {
  editor = "EDITOR",
  table = "TABLE",
  diff = "DIFF",
}

const getArgsTreeData = (args: ArgTypeDef[], keyPrefix = "") => {
  const result: ArgColumnRecord[] = args.map(({ type, ...originData }) => {
    const key = `${keyPrefix}${originData.name}`
    let children: ArgColumnRecord["children"] = []
    switch (type.kind) {
      case "Scalar":
        children = null
        break
      case "InputObject":
        children = getArgsTreeData(type.fields, key)
        break
      case "Enum":
        children = type.values.map((item) => ({
          key: key + item.value,
          name: item.name,
          type: "",
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

const getObjectFieldsTreeData = (objectFields: ObjectFieldTypeDef[], keyPrefix = "") => {
  const result: ArgColumnRecord[] = objectFields.map(({ output, ...originData }) => {
    const key = `${keyPrefix}${originData.name}`
    let children: ArgColumnRecord["children"] = []
    switch (output.kind) {
      case "Scalar":
        children = []
        break
      case "Object":
        children = getObjectFieldsTreeData(output.fields, key)
        break
      case "Enum":
        children = output.values.map((item) => ({
          key: key + item.value,
          name: item.name,
          type: "",
          defaultValue: item.value,
          description: item.description,
          deprecationReason: item.deprecationReason,
          children: null,
        }))
        break
      case "Union":
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

const columnGen = (field: "arguments" | "return"): ColumnsType<ArgColumnRecord> => {
  return [
    {
      title: "Name",
      dataIndex: "name",
      width: "35%",
      render(value, record) {
        const deprecationReason = record.deprecationReason
        if (deprecationReason) {
          return <span className={styles.deprecated}>{value}</span>
        }
        return value
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      width: "25%",
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
      title: field === "arguments" ? "Required" : "Nullable",
      dataIndex: "type",
      width: "20%",
      render(val: string) {
        let result = !val?.endsWith("!")
        if (field === "arguments") {
          result = !!val?.endsWith("!")
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
      title: "Type",
      dataIndex: "type",
      width: "20%",
      render(value: string) {
        return value?.endsWith("!") ? value.slice(0, value.length - 1) : value
      },
    },
  ]
}

export const copy = (selector: string) => {
  const clipboard = new ClipboardJS(selector)
  clipboard.on("success", () => {
    message.success("success")
    clipboard.destroy()
  })
  clipboard.on("error", () => {
    message.error("failed")
    clipboard.destroy()
  })
}

const OperationDoc: FC<IProps> = ({ operation }) => {
  const { IpAddress, isDisplaySidebar, setState, port, typeDefs, localTypeDefs } = useBearStore((ste) => ste)
  const [mode, setMode] = useState<SwitchToggleType>("TABLE")

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operation.args)
  }, [operation.args])
  const argsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen("arguments")
  }, [operation])

  const objectFieldsTreeData = useMemo(() => {
    return getObjectFieldsTreeData([operation])
  }, [operation])
  const objectFieldsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen("return")
  }, [operation])

  const gqlStr = useMemo(() => {
    return genGQLStr(operation)
  }, [operation])

  const schema = buildSchema(typeDefs)
  let localSchema: GraphQLSchema
  try {
    localSchema = buildSchema(
      // 这里给个默认值，意思是当本地schema什么都没有时
      localTypeDefs ||
        `
  schema {ss
    query: Query
  }
  type Query {
    qiufenquery: String
  }
  `
    )
  } catch (error) {
    message.error(`SyntaxError：Unexpected of local schema and ${error}`)
  }
  const localOperation = getOperationsBySchema(localSchema!).find((operationItem) => operationItem.name === operation.name) || null

  /** 渲染 TableView or DiffView or EditorView */
  const renderSwitchJsx = useMemo(() => {
    let paramsJsx = null
    let responseJsx = null
    switch (mode) {
      case SwitchToggleEnum.diff:
        paramsJsx = (
          <ReactDiffViewer
            oldValue={localOperation ? obj2str(localOperation.argsExample) : "nothings..."}
            newValue={obj2str(operation.argsExample)}
            splitView={true}
            compareMethod={DiffMethod.SENTENCES}
            showDiffOnly={false}
            hideLineNumbers
            leftTitle="Old"
            rightTitle="New"
            renderContent={(codeStr) => {
              return <div style={{ fontFamily: "Consolas", fontSize: 12, color: "#000", lineHeight: "13px" }}>{codeStr}</div>
            }}
          />
        )
        responseJsx = (
          <ReactDiffViewer
            oldValue={
              localOperation
                ? printOperationNodeForField({
                    schema: localSchema!,
                    kind: localOperation.operationType,
                    field: localOperation.name,
                  })
                : "nothings..."
            }
            newValue={printOperationNodeForField({
              schema,
              kind: operation.operationType,
              field: operation.name,
            })}
            splitView={true}
            compareMethod={DiffMethod.SENTENCES}
            showDiffOnly={false}
            hideLineNumbers
            leftTitle="Old"
            rightTitle="New"
            renderContent={(codeStr) => {
              return <div style={{ fontFamily: "Consolas", fontSize: 12, color: "#000", lineHeight: "13px" }}>{codeStr}</div>
            }}
          />
        )
        break

      case SwitchToggleEnum.editor:
        paramsJsx = <AceEditor theme="tomorrow" mode="javascript" width="100%" readOnly maxLines={Infinity} value={obj2str(operation.argsExample)} />
        responseJsx = (
          <AceEditor
            theme="textmate"
            mode="javascript"
            width="100%"
            fontSize={13}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            name={`${operation.name}_${operation.operationType}`}
            maxLines={Infinity}
            value={printOperationNodeForField({
              schema,
              kind: operation.operationType,
              field: operation.name,
            })}
            setOptions={{
              theme: "textmate",
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        )
        break

      default:
        paramsJsx = <Table columns={argsColumns} defaultExpandAllRows className={styles.table} dataSource={argsTreeData} pagination={false} bordered />
        responseJsx = <Table columns={objectFieldsColumns} defaultExpandAllRows className={styles.table} dataSource={objectFieldsTreeData} pagination={false} bordered />
        break
    }

    return (
      <>
        {!!argsTreeData.length && (
          <>
            <Divider className={styles.divider} />
            <div className={styles.paramsText}>Params: </div>
            {paramsJsx}
          </>
        )}
        <>
          <div>Response: </div>
          {responseJsx}
        </>
      </>
    )
  }, [mode])

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
              data-clipboard-text={gqlStr}
              className={styles.copyBtn}
              onClick={() => {
                copy("#copy")
              }}
            >
              <CopyOutlined />
              <span className={styles.text}>Copy GQL</span>
            </Space>
          </Tooltip>
          <Tooltip title="Debug">
            <a href={`http://${IpAddress}:${port}/playground?operationName=${encodeURIComponent(operation.name)}&operationType=${encodeURIComponent(operation.operationType)}`}>
              <Space className={styles.copyBtn}>
                <PlayCircleOutlined />
                <span className={styles.text}>Debug</span>
              </Space>
            </a>
          </Tooltip>
          <div className={styles.switch_box}>
            <Switch
              className={styles.switch_diff}
              size="default"
              checked={mode === "DIFF"}
              checkedChildren="diff"
              unCheckedChildren="diff"
              onClick={(checked) => {
                if (checked) {
                  setMode(SwitchToggleEnum.diff)
                } else {
                  setMode(SwitchToggleEnum.table)
                }
              }}
            />
            <Switch
              size="default"
              checked={mode === "EDITOR"}
              checkedChildren="editor"
              unCheckedChildren="table"
              onClick={(checked) => {
                if (checked) {
                  setMode(SwitchToggleEnum.editor)
                } else {
                  setMode(SwitchToggleEnum.table)
                }
              }}
            />
          </div>
        </Space>
      </div>
      {/* 根据情况判断具体渲染内容 */}
      {renderSwitchJsx}
    </Space>
  )
}

export default OperationDoc
