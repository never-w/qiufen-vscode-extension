import * as vscode from 'vscode'
import glob from 'glob'
import fs from 'fs'
import { workspace, window } from 'vscode'
import path from 'path'
import { DefinitionNode, FieldNode, OperationDefinitionNode, DocumentNode, ExecutableDefinitionNode } from 'graphql'
import { updateWorkspaceDocument } from './updateWorkspaceDocument'
import { transformCommentsToDescriptions as parse } from './parseGqlToAstWithComment'
import { printWithComments as print } from './comment'

/** 填充远程最新的operation到工作区对应文件里面 */
export function fillOperationInWorkspace(filePath: string, gql: string, documentAst: DocumentNode) {
  const workspaceDocumentAst = documentAst
  const remoteDocumentAst = parse(gql)

  // 更新本地AST
  const updatedWorkspaceAst: DocumentNode = {
    ...workspaceDocumentAst,
    definitions: workspaceDocumentAst.definitions
      .map((workspaceDefinition) => {
        const remoteDefinition = remoteDocumentAst.definitions.find((remoteDefinition) => {
          const workspaceDefinitionSelections = (workspaceDefinition as ExecutableDefinitionNode).selectionSet
            .selections as FieldNode[]
          const remoteDefinitionSelections = (remoteDefinition as ExecutableDefinitionNode).selectionSet
            .selections as FieldNode[]
          const isTheWorkspaceDefinitionExist = workspaceDefinitionSelections.some(
            (itemSelection) => itemSelection.name.value === remoteDefinitionSelections[0].name.value,
          )
          return remoteDefinition.kind === workspaceDefinition.kind && isTheWorkspaceDefinitionExist
        })

        if (!remoteDefinition) {
          return workspaceDefinition
        }
        return updateWorkspaceDocument(workspaceDefinition, remoteDefinition)
      })
      .filter(Boolean) as DefinitionNode[],
  }

  // 将AST转换回查询字符串
  const updateWorkspaceDocumentStr = print(updatedWorkspaceAst)
  fs.writeFileSync(filePath, updateWorkspaceDocumentStr)
}

// 入口函数
export async function getWorkspaceGqls(gqlName: string) {
  const resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
  const workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
  const filteredWorkspaceGqlFileInfo = workspaceGqlFileInfo.filter((gqlFileItm) =>
    gqlFileItm.operationNames.includes(gqlName),
  )

  if (!filteredWorkspaceGqlFileInfo.length) {
    return Promise.reject('The operation does not exist in a local file')
  }

  if (filteredWorkspaceGqlFileInfo.length >= 2) {
    // 当该传入的operation在本地存在于多个文件夹时
    return Promise.resolve(filteredWorkspaceGqlFileInfo)
  } else {
    return Promise.resolve(filteredWorkspaceGqlFileInfo)
  }
}

/** 匹配工作区后缀 .gql 所有文件，返回文件绝对路径 */
export function getWorkspaceAllGqlResolveFilePaths() {
  const { patternRelativePath = '' } = vscode.workspace.getConfiguration('graphql-qiufen-pro')
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath
  const cwdPath = path.join(workspaceRootPath!, patternRelativePath)

  const gqlFiles = glob.sync('**/*.gql', { cwd: cwdPath })
  const resolveGqlFiles = gqlFiles.map((file) => path.join(cwdPath, file))
  return resolveGqlFiles
}

/** 获取本每个gql文件的对应信息 */
export type GetWorkspaceGqlFileInfoReturnType = {
  filename: string
  content: string
  document: DocumentNode
  operationsAsts: DefinitionNode[]
  operationNames: string[]
}

export function getWorkspaceGqlFileInfo(files: string[]) {
  const result = files.map((file) => {
    const content = fs.readFileSync(file, 'utf8')

    // 这里过滤一下空文件
    if (!content) {
      return {
        filename: file,
        operationsAsts: [],
        operationNames: [],
        document: undefined as unknown as DocumentNode,
        content: '',
      }
    }

    let workspaceDocumentAst: DocumentNode
    try {
      // 这里验证一下本地 gql 接口语法错误没有
      workspaceDocumentAst = parse(content)
    } catch {
      window.showErrorMessage(`${file}: GraphQL Syntax Error`)
      return {
        filename: file,
        document: undefined as unknown as DocumentNode,
        operationsAsts: [],
        operationNames: [],
        content: '',
      }
    }

    // 得到本地每个gql文件的operations names
    const fileItemOperationNames = workspaceDocumentAst.definitions
      .map((operation) => {
        return (operation as OperationDefinitionNode).selectionSet.selections.map((itm: any) => itm.name.value)
      })
      .flat(Infinity) as string[]

    return {
      filename: file,
      content,
      document: workspaceDocumentAst,
      operationsAsts: workspaceDocumentAst.definitions,
      operationNames: fileItemOperationNames,
    }
  })

  return result
}
