import fs from 'fs'
import * as path from 'path'

import { window, workspace } from 'vscode'

function readLocalSchemaTypeDefs(filePath: string) {
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, filePath)
  let localSchema
  try {
    localSchema = fs.readFileSync(qiufenConfigPath).toString()
  } catch (err) {
    window.showWarningMessage('read local schema failed')
    localSchema = ''
  }

  return localSchema
}

export default readLocalSchemaTypeDefs
