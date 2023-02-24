import { workspace } from "vscode"
import * as path from "path"
import fs from "fs"

function readLocalSchemaTypeDefs(filePath?: string) {
  const workspaceRootPath = workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, "src/graphql/generated/schema.graphql")
  const localSchema = fs.readFileSync(qiufenConfigPath).toString()

  return localSchema
}

export default readLocalSchemaTypeDefs
