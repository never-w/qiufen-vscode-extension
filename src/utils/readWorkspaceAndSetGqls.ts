import * as vscode from "vscode"
import glob from "glob"
import fs from "fs"
import { workspace } from "vscode"
import path from "path"
import { DefinitionNode, parse, visit, Kind, print, FieldNode, OperationDefinitionNode, BREAK } from "graphql"

export function readWorkspaceAndSetGqls(gql: string, gqlName: string, gqlType: string) {
  // 工作区根目录
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath
  // 读取项目根目录下所有.gql文件相对路径
  const gqlFiles = glob.sync("**/*.gql", { cwd: workspaceRootPath })
  const resolveGqlFiles = gqlFiles.map((file) => path.join(workspaceRootPath!, file))

  resolveGqlFiles.forEach((fileResolvePath) => {
    try {
      // 在这里验证一哈选择过来的gql接口是不是正确选择的
      parse(gql).definitions[0]
    } catch (error) {
      vscode.window.showErrorMessage("GraphQLError: Syntax Error")
      return
    }
    const updateOperationFieldNode = getUpdateOperationNode(parse(gql).definitions[0], gqlName)

    const content = fs.readFileSync(fileResolvePath, "utf8")
    const operationsAstArr = parse(content).definitions

    const operationsStrArr = operationsAstArr.map((operationAst) => {
      return print(visitOperationTransformer(operationAst, updateOperationFieldNode!, gqlName, gqlType))
    })
    const newContent = operationsStrArr.join("\n\n")

    fs.writeFileSync(fileResolvePath, newContent)
  })
}

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
      // let isOperationType: boolean | undefined
      if (node.kind === Kind.OPERATION_DEFINITION) {
        // isOperationType = node.operation === gqlType
      }
      if (node.kind === Kind.FIELD && node.name.value === operationName) {
        childNode = node
        return BREAK
      }
    },
  })

  // 返回当前需要更新的operation的node
  return childNode
}
