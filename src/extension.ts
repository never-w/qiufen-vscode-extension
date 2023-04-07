import * as vscode from 'vscode'
import * as path from 'path'
import type { Server } from 'http'
import getWorkspaceConfig from './utils/getWorkspaceConfig'
import { defaultQiufenConfig } from './config'
import { startServer } from '../mock_server/index'
import { StatusBarItem } from 'vscode'

let serverMock: Server
let mockStatusBarItem: vscode.StatusBarItem
let currentPanel: vscode.WebviewPanel | undefined

const GraphqlQiufenProCloseMockCommandId = 'graphql-qiufen-pro.qiufenClosed'
const GraphqlQiufenProStartMockCommandId = 'graphql-qiufen-pro.qiufenStart'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(GraphqlQiufenProCloseMockCommandId, () => {
      serverMock.close()
      if (currentPanel) {
        currentPanel?.dispose()
      }
      updateStatusBarItem(GraphqlQiufenProStartMockCommandId, `$(play) Qiufen Start`, mockStatusBarItem)
    }),
    vscode.commands.registerCommand(GraphqlQiufenProStartMockCommandId, async () => {
      const { isExistConfigFile, url, port, qiufenConfig } = getWorkspaceConfig(() => {
        vscode.window.showErrorMessage('No configuration content exists')
      })
      loadingStatusBarItem(mockStatusBarItem, 'Qiufen Loading')
      if (isExistConfigFile) {
        try {
          serverMock = await startServer(qiufenConfig!)
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message)
          updateStatusBarItem(GraphqlQiufenProStartMockCommandId, `$(play) Qiufen Start`, mockStatusBarItem)
          throw err
        }
      } else {
        try {
          serverMock = await startServer({
            port,
            endpoint: {
              url,
            },
            ...defaultQiufenConfig,
          })
        } catch (err) {
          vscode.window.showErrorMessage((err as Error).message)
          updateStatusBarItem(GraphqlQiufenProStartMockCommandId, `$(play) Qiufen Start`, mockStatusBarItem)
          throw err
        }
      }

      const res = await vscode.window.showInformationMessage(
        '是否打开 Mock 网页Doc？',
        {
          modal: true,
        },
        '确定',
      )

      // 当点击确定时才打开网页
      if (!!res) {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`))
      } else {
        // 打开vscode内置webview Doc
        const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
        if (currentPanel) {
          currentPanel.reveal(columnToShowIn)
        }

        if (!currentPanel) {
          currentPanel = vscode.window.createWebviewPanel('graphql-qiufen-pro', 'Graphql Qiufen Pro', columnToShowIn!, {
            retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
            enableScripts: true,
          })
          currentPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'assets/logo', 'qiufen-logo.png'))
          currentPanel.webview.html = getWebviewContent(port)

          // 当前面板被关闭后重置
          currentPanel.onDidDispose(
            () => {
              currentPanel = undefined
              vscode.commands.executeCommand(GraphqlQiufenProCloseMockCommandId)
            },
            null,
            context.subscriptions,
          )
        }
      }

      updateStatusBarItem(GraphqlQiufenProCloseMockCommandId, `$(zap) Qiufen Closed`, mockStatusBarItem, 'yellow')
    }),
  )

  // 设置底部bar图标
  mockStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
  updateStatusBarItem(GraphqlQiufenProStartMockCommandId, `$(play) Qiufen Start`, mockStatusBarItem)
  mockStatusBarItem.show()
}

function loadingStatusBarItem(statusBarItem: StatusBarItem, text: string) {
  statusBarItem.text = `$(sync~spin) ${text}...`
  statusBarItem.tooltip = 'Loading Doc'
  statusBarItem.color = undefined
  statusBarItem.command = undefined
  statusBarItem.show()
}

function updateStatusBarItem(commandId: string, text: string, statusBarItem: StatusBarItem, color?: string) {
  statusBarItem.command = commandId
  statusBarItem.text = text
  statusBarItem.color = color
}

export function deactivate(context: vscode.ExtensionContext) {}

function getWebviewContent(port: number) {
  const renderHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body,html {
                height:100%;
                margin:0;
                padding:0;
                overflow:hidden;
            }
            iframe {
                width:100%;
                height:100%;
                border:none;
            }
        </style>
    </head>
    <body>
        <iframe src="http://localhost:${port}" sandbox="allow-scripts"></iframe>
    </body>
    </html>
          `
  return renderHtml
}

// TODO 暂时不删除以防后面记忆
// const gqlDocSettingCommandId = "graphql-qiufen-pro.settings"
// vscode.commands.registerCommand(gqlDocSettingCommandId, () => {
//   vscode.commands.executeCommand("workbench.action.openSettings", "@ext:never-w.graphql-qiufen-pro")
// }),
