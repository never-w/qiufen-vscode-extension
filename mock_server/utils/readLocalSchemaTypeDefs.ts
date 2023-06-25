import fs from 'fs'
import * as path from 'path'

import { buildSchema } from 'graphql'
import { window, workspace } from 'vscode'

function readLocalSchemaTypeDefs(filePath: string) {
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, filePath)
  let localTypeDefs = `#graphql 
    type Query {
       qiufenNeverW: Int 
    }
    `

  try {
    localTypeDefs = fs.readFileSync(qiufenConfigPath).toString()
  } catch (err) {
    window.showWarningMessage('read local schema failed')
    localTypeDefs = `#graphql 
    type Query {
       qiufenNeverW: Int 
    }
    `
  }

  try {
    buildSchema(localTypeDefs)
  } catch (error) {
    window.showWarningMessage((error as any).message)
    localTypeDefs = `#graphql 
    type Query {
       qiufenNeverW: Int 
    }
    `
  }

  return localTypeDefs
}

export default readLocalSchemaTypeDefs
