import { WebviewView, WebviewViewProvider, commands } from "vscode"

export class TodoListWebView implements WebviewViewProvider {
  aa: VoidFunction
  constructor(aa: () => void) {
    this.aa = aa
  }
  public static viewId: string = "gql-util"

  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    webviewView.webview.options = {
      enableScripts: true,
    }

    webviewView.webview.onDidReceiveMessage((message) => {
      this.aa()
    })

    webviewView.webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>todolist</title>
      </head>
      <body>
        <div>hello gql wyq</div>
        <button id="btn">拉取Gql Doc</button>
       <script>
         const vscode = acquireVsCodeApi();
       btn.onclick = function(){
         vscode.postMessage({ type: '' });
       }
       </script>
      </body>
      </html>
    `
  }
}
