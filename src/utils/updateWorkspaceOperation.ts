import * as vscode from 'vscode'
import glob from 'glob'
import fs from 'fs'
import { workspace, window } from 'vscode'
import path from 'path'
import {
  DefinitionNode,
  parse,
  visit,
  Kind,
  print,
  FieldNode,
  OperationDefinitionNode,
  BREAK,
  VariableDefinitionNode,
  VariableNode,
  DocumentNode,
  ExecutableDefinitionNode,
  SelectionNode,
  InlineFragmentNode,
} from 'graphql'
import { capitalizeFirstLetter } from './dealWordFirstLetter'
import { updateWorkspaceDocument } from './updateWorkspaceDocument'

function visitOperationTransformer(
  ast: OperationDefinitionNode,
  updateOperationNode: FieldNode,
  updateVariablesNode: VariableDefinitionNode[],
  operationName: string,
  gqlType: string,
  typeDefs: string,
) {
  // 是否是合并的大接口
  const isCombineOperation = ast.selectionSet?.selections?.length >= 2

  if (isCombineOperation) {
    const workspaceAllOperationsVariablesNode = ast.variableDefinitions
    const workspaceFields = ast.selectionSet.selections as FieldNode[]

    // 这里是过滤得到不需要更新接口的fields
    const filterOtherFields = workspaceFields.filter((operation) => operation.name.value !== operationName)
    // 这里是得到不需要更新的接口的 field 层级上的参数
    const workspaceOtherFieldArgNames = filterOtherFields.map((itm) => itm.arguments?.map((arg) => (arg.value as VariableNode).name.value)).flat(Infinity) as string[]
    // 这里是得到大接口不需要更新的接口在 Operation 层级上的参数
    const filterWorkspaceOperationVariables = workspaceAllOperationsVariablesNode?.filter((varItm) => workspaceOtherFieldArgNames.includes(varItm.variable.name.value)) || []

    const newUpdateOperationVariablesObj = updateVariablesNode.map((itm) => {
      // 这里是当更新接口参数与工作区已存在不需要更新的接口参数同名冲突时
      if (workspaceOtherFieldArgNames.includes(itm.variable.name.value)) {
        return {
          isConflict: true,
          old: itm,
          new: {
            ...itm,
            variable: {
              ...itm.variable,
              name: {
                ...itm.variable.name,
                value: `${operationName}${capitalizeFirstLetter(itm.variable.name.value)}`,
              },
            },
          },
        }
      }

      return {
        isConflict: false,
        old: null,
        new: itm,
      }
    })

    // 拿到冲突项的参数 obj
    const conflictVariablesObj = newUpdateOperationVariablesObj.filter((itm) => itm.isConflict)
    const conflictVariablesName = conflictVariablesObj.map((item) => ({
      oldName: item.old?.variable.name.value,
      newName: item.new?.variable.name.value,
    }))

    const newUpdateOperationVariables = newUpdateOperationVariablesObj.map((item) => item.new)

    return visit(ast, {
      OperationDefinition(operationDefinitionNode) {
        // 这里去遍历节点拿到当前operation name相同的那个接口再去根据最新的传进来的 参数替换原来的参数
        let isSameOperationName = false
        const newOperationDefinitionNode = visit(operationDefinitionNode, {
          enter(node, key, parent, path, ancestors) {
            //  这里判断等于需要更新的接口替换对应ast
            if (node.kind === Kind.FIELD && node.name.value === operationName && operationDefinitionNode.operation === gqlType) {
              isSameOperationName = true
              return {
                ...updateOperationNode,
                arguments: updateOperationNode.arguments?.map((itm) => {
                  const isConflictArgName = conflictVariablesName.find((varName) => varName.oldName === (itm.value as VariableNode).name.value)

                  if (conflictVariablesObj?.length && isConflictArgName) {
                    return {
                      ...itm,
                      value: {
                        ...itm.value,
                        name: {
                          ...(itm.value as VariableNode).name,
                          value: isConflictArgName.newName,
                          kind: Kind.NAME,
                        },
                      },
                    }
                  }
                  return itm
                }),
              }
            }
          },
        })
        return {
          ...newOperationDefinitionNode,
          variableDefinitions: isSameOperationName ? [...newUpdateOperationVariables, ...filterWorkspaceOperationVariables] : operationDefinitionNode.variableDefinitions,
        }
      },
    })
  } else {
    return visit(ast, {
      OperationDefinition(operationDefinitionNode) {
        // 这里去遍历节点拿到当前operation name相同的那个接口再去根据最新的传进来的 参数替换原来的参数
        let isSameOperationName = false
        const newOperationDefinitionNode = visit(operationDefinitionNode, {
          enter(node, key, parent, path, ancestors) {
            //  这里判断等于需要更新的接口替换对应ast
            if (node.kind === Kind.FIELD && node.name.value === operationName && operationDefinitionNode.operation === gqlType) {
              isSameOperationName = true
              return updateOperationNode
            }
          },
        })

        return {
          ...newOperationDefinitionNode,
          variableDefinitions: isSameOperationName ? updateVariablesNode : operationDefinitionNode.variableDefinitions,
        }
      },
    })
  }
}

function getUpdateOperationNode(ast: DefinitionNode, operationName: string) {
  let childNode: FieldNode | undefined
  let variablesNode: VariableDefinitionNode[] = []
  visit(ast, {
    enter(node, key, parent, path, ancestors) {
      if (node.kind === Kind.OPERATION_DEFINITION) {
        variablesNode = node.variableDefinitions as VariableDefinitionNode[]
      }

      if (node.kind === Kind.FIELD && node.name.value === operationName) {
        childNode = node
        return BREAK
      }
    },
  })

  // 返回当前需要更新的operation的node
  return [childNode, variablesNode] as const
}

/** 填充远程最新的operation到工作区对应文件里面 */
function fillOperationInLocal(filePath: string, gql: string, gqlName: string, gqlType: string, typeDefs: string) {
  const [childNode, variablesNode] = getUpdateOperationNode(parse(gql).definitions[0], gqlName)

  const content = fs.readFileSync(filePath, 'utf8')

  const operationsAstArr = parse(content, {
    noLocation: true,
  }).definitions as OperationDefinitionNode[]

  const operationsStrArr = operationsAstArr.map((operationAst) => {
    return print(visitOperationTransformer(operationAst, childNode!, variablesNode, gqlName, gqlType, typeDefs))
  })
  const newContent = operationsStrArr.join('\n\n')
  fs.writeFileSync(filePath, newContent)

  // -------------------------------------------------TODO:
  const workspaceDocumentAst = parse(content, {
    noLocation: true,
  })
  console.log(workspaceDocumentAst, ' ---')

  const remoteDocumentAst = parse(gql, {
    noLocation: true,
  })

  // 本地查询
  const localQuery = `
query SearchProductsAndServices($searchQuery: String!,$searchQuery2: Int, $searchQuery1: Int, $searchQuery3: Int) {
  searchResults: search(query: $searchQuery) {
    ... on Product {
       w: id
      productPrice (querywwwww: $searchQuery2){
        value
        currency
        discount
      }
    }
    ... on Service {
      id
      name
      servicePrice {
        value
        currency
        isMemberPrice
      }
    }
  }

   books(param: $searchQuery1) {
        title
        fee
      }
   book(param: $searchQuery3) {
        title
        fee
      }
}
`
  // 远程查询
  const remoteQuery = `
query SearchProductsAndServices($searchQuery1: Int!, $searchQuery3: Int) {
  searchResults: search(query: $searchQuery1) {
    ... on Product {
      id
      name
      productPrice (querywwwww: $searchQuery3) {
        value
        discount
      }
    }
    ... on Service {
      id
      name
    }
  }
}
`
  // 解析查询为AST
  const localAst: DocumentNode = parse(localQuery)
  const remoteAst: DocumentNode = parse(remoteQuery)

  // 更新本地AST
  const updatedLocalAst: DocumentNode = {
    ...localAst,
    definitions: localAst.definitions
      .map((workspaceDefinition) => {
        const remoteDefinition = remoteAst.definitions.find((remoteDefinition) => {
          const workspaceDefinitionSelections = (workspaceDefinition as ExecutableDefinitionNode).selectionSet.selections as FieldNode[]
          const remoteDefinitionSelections = (remoteDefinition as ExecutableDefinitionNode).selectionSet.selections as FieldNode[]
          const isTheWorkspaceDefinitionExist = workspaceDefinitionSelections.some((itemSelection) => itemSelection.name.value === remoteDefinitionSelections[0].name.value)
          return remoteDefinition.kind === workspaceDefinition.kind && isTheWorkspaceDefinitionExist
        })

        if (!remoteDefinition) {
          return workspaceDefinition
        }
        return updateWorkspaceDocument(workspaceDefinition, remoteDefinition)
      })
      .filter((definition) => definition !== null) as DefinitionNode[],
  }

  // 将AST转换回查询字符串
  const updatedLocalQuery: string = print(updatedLocalAst)
  console.log(updatedLocalQuery)
}

// 入口函数
export async function setWorkspaceGqls(gql: string, gqlName: string, gqlType: string, typeDefs: string) {
  const resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
  const workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
  const filterWorkspaceGqlFiles = workspaceGqlFileInfo.filter((gqlFileItm) => gqlFileItm.operationNames.includes(gqlName)).map((itm) => itm.filename)

  if (!filterWorkspaceGqlFiles.length) {
    vscode.window.showInformationMessage('The operation does not exist in a local file')
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
      fillOperationInLocal(fileResolvePath, gql, gqlName, gqlType, typeDefs)
    })
    return Promise.resolve(true)
  } else {
    fillOperationInLocal(filterWorkspaceGqlFiles[0], gql, gqlName, gqlType, typeDefs)
    return Promise.resolve(true)
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

    // 这里验证一下本地 gql 接口语法错误没有
    try {
      parse(content)
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

    // 得到本地每个gql文件的operations ast
    const operationsAstArr = parse(content, {
      noLocation: true,
    }).definitions as OperationDefinitionNode[]

    // 得到本地每个gql文件的operations names
    const fileItemOperationNames = operationsAstArr
      .map((operation) => {
        return operation.selectionSet.selections.map((itm: any) => itm.name.value)
      })
      .flat(Infinity) as string[]

    return {
      filename: file,
      content,
      document: parse(content, {
        noLocation: true,
      }),
      operationsAsts: operationsAstArr,
      operationNames: fileItemOperationNames,
    }
  })

  return result
}
