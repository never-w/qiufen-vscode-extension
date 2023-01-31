import * as vscode from "vscode"
import * as path from "path"
import fs from "fs"
import fetchOperations from "./utils/fetchOperations"
import getIpAddress from "./utils/getIpAddress"

let processId: number | undefined
let myStatusBarItem: vscode.StatusBarItem
let currentPanel: vscode.WebviewPanel | undefined = undefined
const gqlDocStartCommandId = "gqlDoc.start"
const gqlDocCloseCommandId = "gqlDoc.close"
// const gqlDocSettingCommandId = "gqlDoc.settings"
const gqlDocMockCommandId = "gqlDoc.mock"
const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(gqlDocStartCommandId, async () => {
      const jsonSettings = vscode.workspace.getConfiguration("gql-doc")
      const qiufenConfigPath = path.join(workspaceRootPath!, "qiufen.config.js")
      const isExistConfigFile = fs.existsSync(qiufenConfigPath)
      let qiufenConfig
      let port: number
      let url: string
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

      const operations = await fetchOperations(url)
      const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

      if (currentPanel) {
        currentPanel.reveal(columnToShowIn)
      }
      if (!currentPanel) {
        currentPanel = vscode.window.createWebviewPanel("gqlDoc", "Gql Doc", columnToShowIn!, {
          retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
          enableScripts: true,
        })
        currentPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "assets/logo", "qiufen-logo.png"))

        // 获取磁盘上的资源路径且，获取在webview中使用的特殊URI
        const srcUrl = currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "dist", "webview.js")))

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
                const obj = {
                  port,
                  operations: operationsRes,
                  IpAddress: getIpAddress(),
                }

                currentPanel!.webview.postMessage(obj)
              })
            }
          },
          undefined,
          context.subscriptions
        )

        currentPanel.webview.html = getWebviewContent(srcUrl)

        // 当前面板被关闭后重置
        currentPanel.onDidDispose(
          () => {
            currentPanel = undefined
            updateStatusBarItem(gqlDocStartCommandId, `$(target) Start Gql Doc`)
          },
          null,
          context.subscriptions
        )
      }

      updateStatusBarItem(gqlDocCloseCommandId, `$(target) Close Gql Doc`, "yellow")
    }),

    // 关闭gql doc命令注册
    vscode.commands.registerCommand(gqlDocCloseCommandId, () => {
      if (currentPanel) {
        currentPanel?.dispose()
        updateStatusBarItem(gqlDocStartCommandId, `$(target) Start Gql Doc`)
      }
    }),

    // vscode.commands.registerCommand(gqlDocSettingCommandId, () => {
    //   vscode.commands.executeCommand("workbench.action.openSettings", "@ext:never-w.gql-doc")
    // }),

    // Mock gql doc命令注册
    vscode.commands.registerCommand(gqlDocMockCommandId, async () => {
      if (!!processId) {
        vscode.window.showWarningMessage("Mock终端已存在！！！")
        return
      } else {
        const terminal = vscode.window.createTerminal()
        terminal.show()
        terminal.sendText("yarn qiufen start")
        const res = await terminal.processId
        processId = res
      }

      vscode.window.onDidCloseTerminal(async (e) => {
        let terminalNum
        const res = await e.processId
        terminalNum = res

        if (terminalNum === processId) {
          processId = undefined
        }
      })
    })
  )

  // 设置底部bar图标
  myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
  context.subscriptions.push(myStatusBarItem)
  updateStatusBarItem(gqlDocStartCommandId, `$(target) Start Gql Doc`)
  myStatusBarItem.show()
}

export function deactivate(context: vscode.ExtensionContext) {}

/** 底部bar更新函数 */
function updateStatusBarItem(commandId: string, text: string, color?: string) {
  myStatusBarItem.command = commandId
  myStatusBarItem.text = text
  myStatusBarItem.color = color
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
