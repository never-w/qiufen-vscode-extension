import * as vscode from "vscode"
import * as path from "path"
import fetchOperations from "./utils/fetchOperations"
import getIpAddress from "./utils/getIpAddress"

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined = undefined
  let processId: number | undefined
  // const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.path // 工作区根目录

  context.subscriptions.push(
    vscode.commands.registerCommand("gqlDoc.start", async () => {
      const settings = vscode.workspace.getConfiguration("gql-doc")
      const operations = await fetchOperations(settings.endpointUrl)

      const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

      if (currentPanel) {
        currentPanel.reveal(columnToShowIn)
        // currentPanel.dispose()
        // executeCommand("gqlDoc.start")
      } else {
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
                operations,
                IpAddress: getIpAddress(),
              }

              currentPanel!.webview.postMessage(messageObj)
            } else {
              fetchOperations(settings.endpointUrl).then((operationsRes) => {
                const obj = {
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
          },
          null,
          context.subscriptions
        )
      }
    }),
    vscode.commands.registerCommand("gqlDoc.settings", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "@ext:never-w.gql-doc")
    }),
    vscode.commands.registerCommand("gqlDoc.mock", async () => {
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
}

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
