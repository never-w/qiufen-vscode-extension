import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { FC } from "react"
import { ArgumentNode, buildSchema, ConstDirectiveNode, FieldNode, getOperationAST, GraphQLSchema, Kind, OperationDefinitionNode, parse, SelectionNode, StringValueNode } from "graphql"
import { message, Space, Table, Tooltip, Switch, Divider, Tag, Button } from "antd"
import type { ColumnsType } from "antd/lib/table"
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer"
import AceEditor from "react-ace"
import obj2str from "stringify-object"
import { CopyOutlined, LoadingOutlined, MenuFoldOutlined, EditOutlined } from "@ant-design/icons"
import ClipboardJS from "clipboard"
import styles from "./index.module.less"
import { getOperationsBySchema } from "@/utils/operation"
import { printGqlOperation, printOperation } from "@/utils/visitOperationTransformer"
import type { TypedOperation, ArgTypeDef, ObjectFieldTypeDef } from "@fruits-chain/qiufen-helpers"
import useBearStore from "@/webview/stores"
import printOperationNodeForField from "@/utils/printOperationNodeForField"
import { traverseOperationTreeGetParentAndChildSelectedKeys, visitDocumentNodeAstGetKeys } from "@/utils/traverseTree"
import { useUpdate } from "@fruits-chain/hooks-laba"
import { FetchDirectiveArg } from "@/utils/interface"
import { fillOneKeyMessageSignSuccess, MessageEnum } from "@/config/postMessage"
import { buildOperationNodeForField } from "@/utils/buildOperationNodeForField"
import { formatOperationDefAst, getOperationDefsAstKeys, NewAstType } from "@/utils/formatOperationDefAst"

interface IProps {
  operation: TypedOperation
}

export type ArgColumnRecord = {
  key: string
  name: ArgTypeDef["name"]
  type: ArgTypeDef["type"]["name"]
  defaultValue: ArgTypeDef["defaultValue"]
  description: ArgTypeDef["description"]
  deprecationReason?: ArgTypeDef["deprecationReason"]
  children: ArgColumnRecord[] | null
  directives?: ConstDirectiveNode[]
}

enum SwitchToggleEnum {
  EDITOR,
  TABLE,
  DIFF,
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
  const { isDisplaySidebar, setState, vscode, directive, typeDefs, localTypeDefs, workspaceGqlFileInfo } = useBearStore((ste) => ste)
  const [spinIcon, setSpinIcon] = useState(false)
  const selectedRowKeys = useRef<string[] | null>(null)
  const update = useUpdate()


  const [operationDefsAstTree, setOperationDefsAstTree] = useState<NewAstType | null>(null)

  const columnGen = useMemo(() => {
    return (field: "arguments" | "return"): ColumnsType<ArgColumnRecord> => {
      return [
        {
          title: "Name",
          dataIndex: "name",
          width: "35%",
          render(value, record) {
            const tmpIsDirective = !!record.directives?.find((itm) => itm.name.value === directive)
            const directivesArgs = record.directives?.find((itm) => itm.name.value === directive)?.arguments as ArgumentNode[]
            const firstArgValue = (directivesArgs?.[0]?.value as StringValueNode)?.value

            const isYellow = FetchDirectiveArg.LOADER === firstArgValue
            const colorStyle: React.CSSProperties | undefined = tmpIsDirective ? { color: isYellow ? "#FF9900" : "red" } : undefined

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const argsTreeData = useMemo(() => {
    return getArgsTreeData(operation.args)
  }, [operation.args])
  const argsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen("arguments")
  }, [columnGen])

  const objectFieldsTreeData = useMemo(() => {
    return getObjectFieldsTreeData([operation])
  }, [operation])
  const objectFieldsColumns: ColumnsType<ArgColumnRecord> = useMemo(() => {
    return columnGen("return")
  }, [columnGen])

  const schema = buildSchema(typeDefs)
  let localSchema: GraphQLSchema | undefined
  try {
    localSchema = buildSchema(
      // 读取本地schema文件失败设置一个默认值
      localTypeDefs ||
      `
  schema {
    query: Query
  }
  type Query {
    qiufenquery: String
  }
  `
    )
  } catch (error) {
    message.error(`${error}`)
  }

  // const localOperation = getOperationsBySchema(localSchema!).find((operationItem) => operationItem.name === operation.name) || null

  // 默认勾选中的key不包含parent keys
  const defaultSelectedRowKeys = useMemo(() => {
    // TODO 暂时后端不支持 自定义指令
    // const keys: string[] = []
    // getDefaultRowKeys(objectFieldsTreeData, keys, directive)
    // return keys

    const filtrationWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((item) => item.operationNames.includes(operation.name))
    // 这个接口在工作区存在于多个文件夹，这种情况我不管它
    if (filtrationWorkspaceGqlFileInfo?.length >= 2) {
      return []
    }

    const operationDefinitionNodes = filtrationWorkspaceGqlFileInfo[0]?.operationsAsts as OperationDefinitionNode[]
    let operationNameFieldNode: FieldNode | undefined
    operationDefinitionNodes?.forEach((operationNode) => {
      const sameOperationNameFieldNode = (operationNode.selectionSet.selections as FieldNode[])?.find((itm) => itm.name.value === operation.name)
      if (!!sameOperationNameFieldNode) {
        operationNameFieldNode = sameOperationNameFieldNode
      }
    })

    const resultKeys = [] as string[]
    visitDocumentNodeAstGetKeys(operationNameFieldNode, resultKeys)

    return resultKeys
  }, [operation.name, workspaceGqlFileInfo])

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

  // 一键填入事件
  const handleOneKeyFillEvent = useCallback(() => {
    setSpinIcon(true)
    // 向插件发送信息
    vscode.postMessage({
      typeDefs,
      type: MessageEnum.ONE_KEY_FILL,
      gqlStr: printGqlOperation(schema, operation, !selectedRowKeys.current ? defaultSelectedKeys : selectedRowKeys.current),
      gqlName: operation.name,
      gqlType: operation.operationType,
    })
    // 接受插件发送过来的信息
    window.addEventListener("message", listener)

    function listener(evt: any) {
      const data = evt.data as string
      if (data === fillOneKeyMessageSignSuccess) {
        message.success("一键填入成功")
        setSpinIcon(false)
      }
      setSpinIcon(false)
      window.removeEventListener("message", listener)
    }
  }, [defaultSelectedKeys, operation, schema, typeDefs, vscode])


  const operationDefNodeAst = useMemo(() => {
    return buildOperationNodeForField({
      schema,
      kind: operation.operationType,
      field: operation.name,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const operationDefsAstTreeTmp = formatOperationDefAst(operationDefNodeAst, false, "")

    setOperationDefsAstTree(operationDefsAstTreeTmp)
  }, [operationDefNodeAst])

  console.log(getOperationDefsAstKeys(operationDefsAstTree!), 'pppppp');


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
            <Space
              id="copy"
              data-clipboard-text={printGqlOperation(schema, operation, !selectedRowKeys.current ? defaultSelectedKeys : selectedRowKeys.current)}
              className={styles.copyBtn}
              onClick={() => {
                update()
                copy("#copy")
              }}
            >
              <CopyOutlined />
              <span className={styles.text}>Copy GQL</span>
            </Space>
          </Tooltip>
        </Space>
      </div>

      <>
        {!!argsTreeData.length && (
          <>
            <Divider className={styles.divider} />
            <div className={styles.paramsText}>Params: </div>
            <Table columns={argsColumns} defaultExpandAllRows className={styles.table} dataSource={argsTreeData} pagination={false} bordered />
          </>
        )}
        <>
          <div>Response: </div>
          <Table
            rowSelection={{
              selectedRowKeys: getOperationDefsAstKeys(operationDefsAstTree!),
              hideSelectAll: true,
              onSelect: (record, selected, selectedRows) => {
                const key = record.key
                const operationDefsAstTreeTmp = formatOperationDefAst(operationDefNodeAst, selected, key)
                setOperationDefsAstTree(operationDefsAstTreeTmp)
              },
            }}
            columns={objectFieldsColumns}
            className={styles.table}
            dataSource={objectFieldsTreeData}
            pagination={false}
            defaultExpandAllRows
            bordered
          />
        </>
      </>
    </Space>
  )
}

export default OperationDoc
