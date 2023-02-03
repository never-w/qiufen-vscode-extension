import express from "express"
import * as vscode from "vscode"
import * as path from "path"
import fetchOperations from "@/utils/fetchOperations"
import getIpAddress from "@/utils/getIpAddress"

const router = express.Router()

const createOperationsController = () => {
  const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
  const jsonSettings = vscode.workspace.getConfiguration("gql-doc")
  let qiufenConfigPath: string
  let qiufenConfig: GraphqlKitConfig
  let port: number
  let url: string

  try {
    qiufenConfigPath = path.join(workspaceRootPath!, "qiufen.config.js")
    delete eval("require.cache")[qiufenConfigPath]
    qiufenConfig = eval("require")(qiufenConfigPath) as GraphqlKitConfig
    port = qiufenConfig.port
    url = qiufenConfig.endpoint.url
  } catch {
    port = jsonSettings?.port
    url = jsonSettings?.endpointUrl
  }

  router.get("/operations", async (req, res) => {
    const operations = await fetchOperations(url)
    res.send(operations)
  })

  router.get("/ip", async (req, res) => {
    res.send({
      port,
      IpAddress: getIpAddress(),
    })
  })

  return router
}

export default createOperationsController
