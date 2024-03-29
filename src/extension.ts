import * as path from 'path'

import * as vscode from 'vscode'

import { startDocServer } from '../doc_server/index'
import { startMockServer } from '../mock_server/index'

import getConfiguration from './utils/getWorkspaceConfig'

import type { JsonSettingsType } from './utils/getWorkspaceConfig'
import type { ApolloServer } from '@apollo/server'
import type { Server } from 'http'
import type { StatusBarItem } from 'vscode'

let docServer: Server
let mockServer: ApolloServer
let docStatusBarItem: vscode.StatusBarItem
let mockStatusBarItem: vscode.StatusBarItem
let currentPanel: vscode.WebviewPanel | undefined

const GraphqlQiufenProCloseDocCommandId = 'graphql-qiufen-pro.qiufenClosed'
const GraphqlQiufenProStartDocCommandId = 'graphql-qiufen-pro.qiufenStart'
const GraphqlQiufenProCloseMockCommandId = 'graphql-qiufen-pro.qiufenMockClosed'
const GraphqlQiufenProStartMockCommandId = 'graphql-qiufen-pro.qiufenMockStart'

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(GraphqlQiufenProCloseMockCommandId, () => {
      mockServer.stop()
      updateStatusBarItem(
        GraphqlQiufenProStartMockCommandId,
        `$(lightbulb) Mock`,
        mockStatusBarItem,
        'Open Qiufen Mock Server',
      )
    }),
    vscode.commands.registerCommand(
      GraphqlQiufenProStartMockCommandId,
      async () => {
        const qiufenConfigRes = await getConfiguration()
        loadingStatusBarItem(mockStatusBarItem, 'Loading', 'Mocking loading')

        try {
          mockServer = await startMockServer(
            qiufenConfigRes,
            qiufenConfigRes.localSchemaFile,
          )
        } catch (err) {
          updateStatusBarItem(
            GraphqlQiufenProStartMockCommandId,
            `$(lightbulb) Mock`,
            mockStatusBarItem,
            'Open Qiufen Mock Server',
          )
          throw err
        }

        updateStatusBarItem(
          GraphqlQiufenProCloseMockCommandId,
          `$(zap) Mock Closed`,
          mockStatusBarItem,
          'Close Qiufen Mock Server',
          'yellow',
        )
      },
    ),

    vscode.commands.registerCommand(GraphqlQiufenProCloseDocCommandId, () => {
      docServer.close()
      if (currentPanel) {
        currentPanel?.dispose()
      }
      updateStatusBarItem(
        GraphqlQiufenProStartDocCommandId,
        `$(play) Qiufen Start`,
        docStatusBarItem,
        'Open Qiufen Doc Server',
      )
    }),
    vscode.commands.registerCommand(
      GraphqlQiufenProStartDocCommandId,
      async () => {
        let serverPort
        const jsonSettings = vscode.workspace.getConfiguration(
          'graphql-qiufen-pro',
        ) as unknown as JsonSettingsType
        const qiufenConfigRes = await getConfiguration()
        loadingStatusBarItem(docStatusBarItem, 'Qiufen Loading', 'Doc loading')

        try {
          const { expressServer, resPort } = await startDocServer(
            qiufenConfigRes,
          )
          docServer = expressServer
          serverPort = resPort
        } catch (err) {
          updateStatusBarItem(
            GraphqlQiufenProStartDocCommandId,
            `$(play) Qiufen Start`,
            docStatusBarItem,
            'Open Qiufen Doc Server',
          )
          throw err
        }

        if (jsonSettings.isBrowser) {
          vscode.env.openExternal(
            vscode.Uri.parse(`http:localhost:${serverPort}`),
          )
        } else {
          // 打开vscode内置webview Doc
          const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined
          if (currentPanel) {
            currentPanel.reveal(columnToShowIn)
          }

          if (!currentPanel) {
            currentPanel = vscode.window.createWebviewPanel(
              'graphql-qiufen-pro',
              'Graphql Qiufen Pro',
              columnToShowIn!,
              {
                retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
                enableScripts: true,
              },
            )
            currentPanel.iconPath = vscode.Uri.file(
              path.join(
                context.extensionPath,
                'assets/logo',
                'qiufen-logo.png',
              ),
            )
            currentPanel.webview.html = getWebviewContent(serverPort)

            // 当前面板被关闭后重置
            currentPanel.onDidDispose(
              () => {
                currentPanel = undefined
                vscode.commands.executeCommand(
                  GraphqlQiufenProCloseDocCommandId,
                )
              },
              null,
              context.subscriptions,
            )
          }
        }

        updateStatusBarItem(
          GraphqlQiufenProCloseDocCommandId,
          `$(zap) Qiufen Closed`,
          docStatusBarItem,
          'Close Qiufen Doc Server',
          'yellow',
        )
      },
    ),
  )

  // 设置底部bar图标
  docStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  )
  mockStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  )

  updateStatusBarItem(
    GraphqlQiufenProStartDocCommandId,
    `$(play) Qiufen Start`,
    docStatusBarItem,
    'Open Qiufen Doc Server',
  )
  docStatusBarItem.show()

  updateStatusBarItem(
    GraphqlQiufenProStartMockCommandId,
    `$(lightbulb) Mock`,
    mockStatusBarItem,
    'Open Qiufen Mock Server',
  )
  mockStatusBarItem.show()
}

function loadingStatusBarItem(
  statusBarItem: StatusBarItem,
  text: string,
  tooltip: string,
) {
  statusBarItem.text = `$(sync~spin) ${text}...`
  statusBarItem.tooltip = tooltip
  statusBarItem.color = undefined
  statusBarItem.command = undefined
  statusBarItem.show()
}

function updateStatusBarItem(
  commandId: string,
  text: string,
  statusBarItem: StatusBarItem,
  tooltip: string,
  color?: string,
) {
  statusBarItem.command = commandId
  statusBarItem.text = text
  statusBarItem.tooltip = tooltip
  statusBarItem.color = color
}

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
