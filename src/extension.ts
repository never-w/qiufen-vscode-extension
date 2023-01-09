import * as vscode from "vscode"
import * as path from "path"

import { getOperationsBySchema, genGQLStrInGroup } from "@fruits-chain/qiufen-helpers"
// import fs from "fs"
import getSchema from "./utils/getSchema"

export function activate(context: vscode.ExtensionContext) {
  let currentPanel: vscode.WebviewPanel | undefined = undefined

  context.subscriptions.push(
    vscode.commands.registerCommand("catCoding.start", async () => {
      const endpointUrl = "http://192.168.10.233:9406/graphql"
      const schema = await getSchema(endpointUrl)
      const operations = getOperationsBySchema(schema)
      const gqlStr = genGQLStrInGroup("库存调整", operations.slice(0, 5))

      const columnToShowIn = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

      if (currentPanel) {
        currentPanel.reveal(columnToShowIn)
      } else {
        currentPanel = vscode.window.createWebviewPanel("catCoding", "Gql Doc", columnToShowIn!, {
          retainContextWhenHidden: true, // 保证 Webview 所在页面进入后台时不被释放
          enableScripts: true,
        })
        currentPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, "logo192.png"))

        // 获取磁盘上的资源路径且，获取在webview中使用的特殊URI
        const srcUrl = currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, "dist", "webview.js")))

        currentPanel.webview.onDidReceiveMessage(
          (message) => {
            if (message.data) {
              currentPanel!.webview.postMessage(operations)
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
            <script defer="defer" src="${srcUrl}"></script>
          </head>
          <body>
             <noscript>You need to enable JavaScript to run this app.</noscript>
             <div id="root"></div>
          </body>
          </html>
          `
  return renderHtml
}
