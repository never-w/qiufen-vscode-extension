import { StatusBarItem } from "vscode"

/** 底部bar更新函数 */
function updateStatusBarItem(commandId: string, text: string, statusBarItem: StatusBarItem, color?: string) {
  statusBarItem.command = commandId
  statusBarItem.text = text
  statusBarItem.color = color
}

export default updateStatusBarItem
