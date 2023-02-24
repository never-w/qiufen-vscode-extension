import { StatusBarItem } from "vscode"

export function loadingStatusBarItem(statusBarItem: StatusBarItem, text: string) {
  statusBarItem.text = `$(sync~spin) ${text}...`
  statusBarItem.tooltip = "Loading Doc"
  statusBarItem.color = undefined
  statusBarItem.command = undefined
  statusBarItem.show()
}

// export function resetStatusBarItem(commandId: string, text: string, statusBarItem: StatusBarItem, color?: string) {}

export function updateStatusBarItem(commandId: string, text: string, statusBarItem: StatusBarItem, color?: string) {
  statusBarItem.command = commandId
  statusBarItem.text = text
  statusBarItem.color = color
}
