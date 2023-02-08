import * as vscode from "vscode"
import * as path from "path"
import fs from "fs"
import type { Server } from "http"
import fetchOperations from "./utils/fetchOperations"
import getIpAddress from "./utils/getIpAddress"
import { startServer } from "./server-mock/src"
import { defaultQiufenConfig } from "./config"

let serverMock: Server
let docStatusBarItem: vscode.StatusBarItem
let mockStatusBarItem: vscode.StatusBarItem
let currentPanel: vscode.WebviewPanel | undefined = undefined

const gqlDocStartCommandId = "gqlDoc.start"
const gqlDocCloseCommandId = "gqlDoc.close"
const gqlDocMockCloseCommandId = "gqlDoc.mockClose"
const gqlDocMockCommandId = "gqlDoc.mock"

// const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录

// const qiufenConfigPath = path.join(workspaceRootPath!, "qiufen.config.js")
// const isExistConfigFile = fs.existsSync(qiufenConfigPath)
let qiufenConfig: GraphqlKitConfig
let port: number
let url: string

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(gqlDocStartCommandId, async () => {
      const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
      if (currentPanel) {
        currentPanel.reveal(columnToShowIn)
      }

      if (!currentPanel) {
        const { qiufenConfigPath, isExistConfigFile } = getWorkspaceConfig()
        const jsonSettings = vscode.workspace.getConfiguration("gql-doc")
        if (isExistConfigFile) {
          /** 去除require缓存 */
          delete eval("require.cache")[qiufenConfigPath]
          qiufenConfig = eval("require")(qiufenConfigPath) as GraphqlKitConfig
          port = qiufenConfig.port
          url = qiufenConfig.endpoint.url
        } else {
          port = jsonSettings?.port
          url = jsonSettings?.endpointUrl
        }

        if (!port) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置port！！！")
        }
        if (!url) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置schema地址！！！")
        }

        // 获取gql接口数据
        const operations = await fetchOperations(url)
        if (!operations) {
          return
        }

        // 创建webview画板
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
              const messageObj = {
                port,
                operations,
                IpAddress: getIpAddress(),
              }

              currentPanel!.webview.postMessage(messageObj)
            } else {
              fetchOperations(url).then((operationsRes) => {
                const messageObj = {
                  port,
                  operations: operationsRes,
                  IpAddress: getIpAddress(),
                }

                currentPanel!.webview.postMessage(messageObj)
              })
            }
          },
          undefined,
          context.subscriptions
        )

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

      updateStatusBarItem(gqlDocCloseCommandId, `$(target) Close Doc`, docStatusBarItem, "yellow")
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
      const { qiufenConfigPath, isExistConfigFile } = getWorkspaceConfig()
      const jsonSettings = vscode.workspace.getConfiguration("gql-doc")
      if (isExistConfigFile) {
        /** 去除require缓存 */
        delete eval("require.cache")[qiufenConfigPath]
        qiufenConfig = eval("require")(qiufenConfigPath) as GraphqlKitConfig
        port = qiufenConfig.port
        url = qiufenConfig.endpoint.url

        if (!port) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置port！！！")
        }
        if (!url) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置schema地址！！！")
        }

        try {
          serverMock = await startServer(qiufenConfig)
        } catch {
          vscode.window.showErrorMessage("网络异常！！！")
          return
        }
      } else {
        port = jsonSettings?.port
        url = jsonSettings?.endpointUrl

        if (!port) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置port！！！")
        }
        if (!url) {
          return vscode.window.showErrorMessage("请在项目根目录 .vscode/settings.json 中配置schema地址！！！")
        }
        try {
          serverMock = await startServer({
            port,
            endpoint: {
              url,
            },
            ...defaultQiufenConfig,
          })
        } catch {
          vscode.window.showErrorMessage("网络异常！！！")
          return
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

/** 底部bar更新函数 */
function updateStatusBarItem(commandId: string, text: string, statusBarItem: vscode.StatusBarItem, color?: string) {
  statusBarItem.command = commandId
  statusBarItem.text = text
  statusBarItem.color = color
}

function getWorkspaceConfig() {
  const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const qiufenConfigPath = path.join(workspaceRootPath!, "qiufen.config.js")
  const isExistConfigFile = fs.existsSync(qiufenConfigPath)

  return { workspaceRootPath, qiufenConfigPath, isExistConfigFile }
}

/** webview函数 */
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

export function deactivate(context: vscode.ExtensionContext) {}

// const gqlDocSettingCommandId = "gqlDoc.settings"
// vscode.commands.registerCommand(gqlDocSettingCommandId, () => {
//   vscode.commands.executeCommand("workbench.action.openSettings", "@ext:never-w.gql-doc")
// }),
