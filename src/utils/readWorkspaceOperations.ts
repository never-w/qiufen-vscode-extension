import * as vscode from "vscode"
import glob from "glob"
import fs from "fs"
import { workspace, window } from "vscode"
import path from "path"
import { DefinitionNode, parse, visit, Kind, print, FieldNode, OperationDefinitionNode, BREAK } from "graphql"

function visitOperationTransformer(ast: DefinitionNode, updateOperationNode: FieldNode, operationName: string, gqlType: string) {
  return visit(ast, {
    enter(node, key, parent, path, ancestors) {
      //  这里判断等于需要更新的接口替换ast
      if (node.kind === Kind.FIELD && node.name.value === operationName) {
        const rootOperationType = (ancestors[0] as OperationDefinitionNode).operation
        if (rootOperationType === gqlType) {
          return updateOperationNode
        }
      }
    },
  })
}

function getUpdateOperationNode(ast: DefinitionNode, operationName: string) {
  let childNode: FieldNode | undefined
  visit(ast, {
    enter(node, key, parent, path, ancestors) {
      if (node.kind === Kind.FIELD && node.name.value === operationName) {
        childNode = node
        return BREAK
      }
    },
  })

  // 返回当前需要更新的operation的node
  return childNode
}

function fillOperationInLocal(filePath: string, gql: string, gqlName: string, gqlType: string) {
  const updateOperationFieldNode = getUpdateOperationNode(parse(gql).definitions[0], gqlName)

  const content = fs.readFileSync(filePath, "utf8")
  const operationsAstArr = parse(content).definitions

  const operationsStrArr = operationsAstArr.map((operationAst) => {
    return print(visitOperationTransformer(operationAst, updateOperationFieldNode!, gqlName, gqlType))
  })
  const newContent = operationsStrArr.join("\n\n")
  fs.writeFileSync(filePath, newContent)
}

export function getLocalAllGqlResolveFilePaths() {
  const { patternRelativePath = "" } = vscode.workspace.getConfiguration("graphql-qiufen-pro")
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath
  const cwdPath = path.join(workspaceRootPath!, patternRelativePath)

  const gqlFiles = glob.sync("**/*.gql", { cwd: cwdPath })
  const resolveGqlFiles = gqlFiles.map((file) => path.join(cwdPath, file))
  return resolveGqlFiles
}

export async function setWorkspaceGqls(gql: string, gqlName: string, gqlType: string) {
  try {
    // 在这里验证一哈选择过来的gql接口是不是正确选择的
    parse(gql).definitions[0]
  } catch (error) {
    vscode.window.showErrorMessage("GraphQLError: Syntax Error")
    return Promise.reject("GraphQLError: Syntax Error")
  }

  const resolveGqlFiles = getLocalAllGqlResolveFilePaths()
  const workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
  const filterWorkspaceGqlFiles = workspaceGqlFileInfo.filter((gqlFileItm) => gqlFileItm.operationNames.includes(gqlName)).map((itm) => itm.filename)

  if (!filterWorkspaceGqlFiles.length) {
    vscode.window.showInformationMessage("The operation does not exist in a local file")
    return Promise.resolve(false)
  }

  if (filterWorkspaceGqlFiles.length >= 2) {
    // 当该传入的operation在本地存在于多个文件夹时
    const items = filterWorkspaceGqlFiles
    const res = await window.showQuickPick(items, {
      canPickMany: true,
    })

    if (!res?.length) {
      return Promise.resolve(false)
    }

    res.forEach((fileResolvePath) => {
      fillOperationInLocal(fileResolvePath, gql, gqlName, gqlType)
    })
    return Promise.resolve(true)
  } else {
    fillOperationInLocal(filterWorkspaceGqlFiles[0], gql, gqlName, gqlType)
    return Promise.resolve(true)
  }
}

/** 获取本每个gql文件的对应信息 */
export function getWorkspaceGqlFileInfo(files: string[]) {
  const result = files.map((file) => {
    const content = fs.readFileSync(file, "utf8")

    // 这里过滤一下空文件
    if (!content) {
      return {
        filename: file,
        operationsAsts: [],
        operationNames: "",
      }
    }

    // 这里验证一下本地 gql 接口语法错误没有
    try {
      parse(content)
    } catch {
      window.showErrorMessage(`${file}: GraphQL Syntax Error`)
      return {
        filename: file,
        operationsAsts: [],
        operationNames: "",
      }
    }

    // 得到本地每个gql文件的operations ast
    const operationsAstArr = parse(content, {
      noLocation: true,
    }).definitions

    // 得到本地每个gql文件的operations names
    const fileItemOperationNames = operationsAstArr
      .map((operation: any) => {
        return operation.selectionSet.selections.map((itm: any) => itm.name.value)
      })
      .flat(Infinity) as string[]

    return {
      filename: file,
      operationsAsts: operationsAstArr,
      operationNames: fileItemOperationNames,
    }
  })

  return result
}
