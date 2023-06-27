import path from 'path'

import { fetchTypeDefs } from '@fruits-chain/qiufen-pro-helpers'
import { json } from 'body-parser'
import cors from 'cors'
import express from 'express'
import getPort from 'get-port'
import * as vscode from 'vscode'

import getIpAddress from './utils/getIpAddress'
import readLocalSchemaTypeDefs from './utils/readLocalSchemaTypeDefs'
import {
  getWorkspaceGqls,
  fillOperationInWorkspace,
  getWorkspaceAllGqlsNameAndData,
} from './utils/syncWorkspaceGqls'

import type { ReturnTypeGetWorkspaceGqlFileInfo } from './utils/syncWorkspaceGqls'
import type { GraphqlKitConfig } from '@fruits-chain/qiufen-pro-graphql-mock'

export async function startDocServer(config: GraphqlKitConfig) {
  const { endpoint, port } = config
  const jsonSettings = vscode.workspace.getConfiguration('graphql-qiufen-pro')

  const app = express()
  app.use(cors())
  app.use(json({ limit: Infinity }))

  const backendTypeDefs = await fetchTypeDefs(endpoint.url)
  const localTypeDefs = readLocalSchemaTypeDefs(
    jsonSettings.patternSchemaRelativePath,
  )
  const { workspaceGqlNames, workspaceGqlFileInfo } =
    getWorkspaceAllGqlsNameAndData()

  app.get('/operations', async (req, res) => {
    res.send({
      isAllAddComment: jsonSettings.isAllAddComment,
      typeDefs: backendTypeDefs,
      maxDepth: jsonSettings.maxDepth,
      directive: jsonSettings.directive,
      localTypeDefs: localTypeDefs,
      workspaceGqlNames,
      workspaceGqlFileInfo,
      port,
      IpAddress: getIpAddress(),
    })
  })

  app.get('/reload/operations', async (req, res) => {
    // 这里再次获取后端sdl，是因为web网页在reload时要及时更新
    const newBackendTypeDefs = await fetchTypeDefs(endpoint.url)
    const newLocalTypeDefs = readLocalSchemaTypeDefs(
      jsonSettings.patternSchemaRelativePath,
    )
    const {
      workspaceGqlNames: newWorkspaceGqlNames,
      workspaceGqlFileInfo: newWorkspaceGqlFileInfo,
    } = getWorkspaceAllGqlsNameAndData()

    res.send({
      isAllAddComment: jsonSettings.isAllAddComment,
      typeDefs: newBackendTypeDefs,
      maxDepth: jsonSettings.maxDepth,
      directive: jsonSettings.directive,
      localTypeDefs: newLocalTypeDefs,
      workspaceGqlNames: newWorkspaceGqlNames,
      workspaceGqlFileInfo: newWorkspaceGqlFileInfo,
      port,
      IpAddress: getIpAddress(),
    })
  })

  app.post('/update', async (req, res) => {
    const { operationStr, gqlName } = req.body
    try {
      const workspaceRes = await getWorkspaceGqls(gqlName)
      if (workspaceRes?.length > 1) {
        // 如果需要更新的gql存在于本地多个文件夹
        res.send({ message: workspaceRes })
      } else {
        // 本地更新时需要全字段comment ---> true，所以传入 true
        fillOperationInWorkspace(
          workspaceRes[0].filename,
          operationStr,
          workspaceRes[0].document,
          true,
        )
        res.send({ message: '一键填入成功' })
      }
    } catch (error) {
      res.status(406).send({ message: error })
    }
  })

  app.post('/multiple', async (req, res) => {
    const { info, gql } = req.body

    info.forEach((infoItm: ReturnTypeGetWorkspaceGqlFileInfo[0]) => {
      // 本地更新时需要全字段comment ---> true，所以传入 true
      fillOperationInWorkspace(infoItm.filename, gql, infoItm.document, true)
    })
    res.send({ message: '一键填入成功' })
  })

  app.use(express.static(path.resolve(__dirname, '../dist-page-view')))
  // 处理所有路由请求，返回React应用的HTML文件
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist-page-view', 'index.html'))
  })

  try {
    const tmpPort = await getPort()
    const expressServer = app.listen(tmpPort, () => {
      // eslint-disable-next-line no-console
      console.log(
        `Server listening on port http://localhost:${tmpPort}/graphql`,
      )
    })

    return { expressServer, resPort: tmpPort }
  } catch (error: any) {
    throw new Error(error)
  }
}
