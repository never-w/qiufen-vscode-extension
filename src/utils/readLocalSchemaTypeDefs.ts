import { window, workspace } from "vscode"
import * as path from "path"
import fs from "fs"

function readLocalSchemaTypeDefs(filePath: string = "src/graphql/generated/schema.graphql") {
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, filePath)
  let localSchema
  try {
    localSchema = fs.readFileSync(qiufenConfigPath).toString()
  } catch (error) {
    window.showErrorMessage("read local schema error")
    return
  }

  return localSchema
}

export default readLocalSchemaTypeDefs
