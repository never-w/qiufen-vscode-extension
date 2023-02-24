import * as vscode from "vscode"
import * as path from "path"
import fs from "fs"

/** 获取工作区qiufen配置 */
function getWorkspaceConfig() {
  const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, "qiufen.config.js")
  const isExistConfigFile = fs.existsSync(qiufenConfigPath)

  return { workspaceRootPath, qiufenConfigPath, isExistConfigFile }
}

export default getWorkspaceConfig
