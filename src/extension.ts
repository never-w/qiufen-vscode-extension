import * as vscode from "vscode"
import * as path from "path"
import type { Server } from "http"
import { buildSchema } from "graphql"
import getIpAddress from "./utils/getIpAddress"
import { getOperationsBySchema } from "./utils/operation"
import getWorkspaceConfig from "./utils/getWorkspaceConfig"
import fetchRemoteSchemaTypeDefs from "./utils/fetchRemoteSchemaTypeDefs"
import { updateStatusBarItem, loadingStatusBarItem } from "./utils/updateStatusBarItem"
import { defaultQiufenConfig } from "./config"
import { gqlDocCloseCommandId, gqlDocMockCloseCommandId, gqlDocMockCommandId, gqlDocStartCommandId } from "./config/commands"
import { startServer } from "./server-mock/src"
import readLocalSchemaTypeDefs from "./utils/readLocalSchemaTypeDefs"

let serverMock: Server
let docStatusBarItem: vscode.StatusBarItem
let mockStatusBarItem: vscode.StatusBarItem
let currentPanel: vscode.WebviewPanel | undefined

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(gqlDocStartCommandId, async () => {
      const jsonSettings = vscode.workspace.getConfiguration("gql-doc")

      const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
      if (currentPanel) {
        currentPanel.reveal(columnToShowIn)
      }

      if (!currentPanel) {
        loadingStatusBarItem(docStatusBarItem, "Doc")
        const { url, port } = getWorkspaceConfig()

        // 获取远程schema typeDefs
        let backendTypeDefs: string | undefined
        try {
          backendTypeDefs = await fetchRemoteSchemaTypeDefs(url)
        } catch (e) {
          updateStatusBarItem(gqlDocStartCommandId, `$(target) Doc`, docStatusBarItem)
          throw e
        }
        const schema = buildSchema(backendTypeDefs)
        const operations = getOperationsBySchema(schema)
        if (!operations) {
          return
        }

        currentPanel = vscode.window.createWebviewPanel("gqlDoc", "Gql Doc", columnToShowIn!, {
          retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
          enableScripts: true,
        })
        currentPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "assets/logo", "qiufen-logo.png"))
        // 获取磁盘上的资源路径且，获取在webview中使用的特殊URI
        const srcUrl = currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "dist", "webview.js")))
        currentPanel.webview.html = getWebviewContent(srcUrl)

        // 接受webview发送的信息，且再向webview发送信息，这样做为了解决它们两者通信有时不得行的bug
        currentPanel.webview.onDidReceiveMessage(
          (message) => {
            if (message) {
              // 读取本地的schema类型定义
              const localTypeDefs = readLocalSchemaTypeDefs()
              const messageObj = {
                directive: jsonSettings.directive,
                localTypeDefs,
                typeDefs: backendTypeDefs,
                port,
                operations,
                IpAddress: getIpAddress(),
              }

              currentPanel!.webview.postMessage(messageObj)
            } else {
              fetchRemoteSchemaTypeDefs(url)
                .then((resTypeDefs) => {
                  // 读取本地的schema类型定义
                  const localTypeDefs = readLocalSchemaTypeDefs()
                  const schema = buildSchema(resTypeDefs)
                  const operations = getOperationsBySchema(schema)
                  const messageObj = {
                    directive: jsonSettings.directive,
                    localTypeDefs,
                    typeDefs: resTypeDefs,
                    port,
                    operations,
                    IpAddress: getIpAddress(),
                  }

                  currentPanel!.webview.postMessage(messageObj)
                })
                .catch((e) => {
                  throw e
                })
            }
          },
          undefined,
          context.subscriptions
        )

        updateStatusBarItem(gqlDocCloseCommandId, `$(target) Close Doc`, docStatusBarItem, "yellow")

        // 当前面板被关闭后重置
        currentPanel.onDidDispose(
          () => {
            currentPanel = undefined
            updateStatusBarItem(gqlDocStartCommandId, `$(target) Doc`, docStatusBarItem)
          },
          null,
          context.subscriptions
        )
      }
    }),
    // 关闭gql doc命令注册
    vscode.commands.registerCommand(gqlDocCloseCommandId, () => {
      if (currentPanel) {
        currentPanel?.dispose()
        updateStatusBarItem(gqlDocStartCommandId, `$(target) Doc`, docStatusBarItem)
      }
    }),
    // Close Mock命令注册
    vscode.commands.registerCommand(gqlDocMockCloseCommandId, () => {
      serverMock.close()
      updateStatusBarItem(gqlDocMockCommandId, `$(play) Mock`, mockStatusBarItem)
    }),
    // Start Mock命令注册
    vscode.commands.registerCommand(gqlDocMockCommandId, async () => {
      const { isExistConfigFile, url, port, qiufenConfig } = getWorkspaceConfig()
      loadingStatusBarItem(mockStatusBarItem, "Mock")
      if (isExistConfigFile) {
        try {
          serverMock = await startServer(qiufenConfig!)
        } catch (err) {
          updateStatusBarItem(gqlDocMockCommandId, `$(play) Mock`, mockStatusBarItem)
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
          updateStatusBarItem(gqlDocMockCommandId, `$(play) Mock`, mockStatusBarItem)
          throw err
        }
      }

      const res = await vscode.window.showInformationMessage(
        "是否打开 Mock 网页Doc？",
        {
          modal: true,
        },
        "确定"
      )

      // 当点击确定时才打开网页
      if (!!res) {
        vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${port}`))
      }

      updateStatusBarItem(gqlDocMockCloseCommandId, `$(play) Close Mock`, mockStatusBarItem, "yellow")
    })
  )

  // 设置底部bar图标
  docStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
  mockStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
  context.subscriptions.push(docStatusBarItem, mockStatusBarItem)
  updateStatusBarItem(gqlDocStartCommandId, `$(target) Doc`, docStatusBarItem)
  docStatusBarItem.show()
  updateStatusBarItem(gqlDocMockCommandId, `$(play) Mock`, mockStatusBarItem)
  mockStatusBarItem.show()
}

export function deactivate(context: vscode.ExtensionContext) {}

function getWebviewContent(srcUrl: vscode.Uri) {
  const renderHtml = `
          <!DOCTYPE html>
          <html lang="en">
           <head>
             <meta charset="utf-8" />
             <meta name="viewport" content="width=device-width,initial-scale=1" />
            <script sandbox="allow-scripts allow-modals allow-forms allow-same-origin" defer="defer" src="${srcUrl}"></script>
          </head>
          <body>
             <noscript>You need to enable JavaScript to run this app.</noscript>
             <div id="root"></div>
          </body>
          </html>
          `
  return renderHtml
}

// TODO 暂时不删除以防后面记忆
// const gqlDocSettingCommandId = "gqlDoc.settings"
// vscode.commands.registerCommand(gqlDocSettingCommandId, () => {
//   vscode.commands.executeCommand("workbench.action.openSettings", "@ext:never-w.gql-doc")
// }),
