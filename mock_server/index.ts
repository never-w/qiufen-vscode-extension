import * as vscode from 'vscode'
import { ApolloServer } from '@apollo/server'
import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'
import { json } from 'body-parser'
import express from 'express'
import path from 'path'
import fetchRemoteSchemaTypeDefs from '../views-doc/src/utils/fetchRemoteSchemaTypeDefs'
import {
  getWorkspaceAllGqlResolveFilePaths,
  getWorkspaceGqlFileInfo,
  getWorkspaceGqls,
  fillOperationInWorkspace,
  GetWorkspaceGqlFileInfoReturnType,
} from '../views-doc/src/utils/syncWorkspaceGqls'
import readLocalSchemaTypeDefs from '../views-doc/src/utils/readLocalSchemaTypeDefs'
import getIpAddress from '../views-doc/src/utils/getIpAddress'
import portscanner from 'portscanner'

export async function startServer(config: GraphqlKitConfig) {
  const { endpoint, port, mock } = config
  const jsonSettings = vscode.workspace.getConfiguration('graphql-qiufen-pro')

  const app = express()

  const backendTypeDefs = await fetchRemoteSchemaTypeDefs(endpoint.url)

  const server = new ApolloServer({
    schema: addMocksToSchema({
      schema: makeExecutableSchema({ typeDefs: backendTypeDefs }),
      mocks: mock?.scalarMap,
    }),
  })

  await server.start()
  app.use('/graphql', cors<cors.CorsRequest>(), json(), expressMiddleware(server))
  app.use(cors())
  app.use(json({ limit: Infinity }))

  app.get('/operations', async (req, res) => {
    const resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
    const workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)

    const workspaceGqlNames = workspaceGqlFileInfo.map((itm) => itm.operationNames).flat(Infinity) as string[]
    const localTypeDefs = readLocalSchemaTypeDefs()
    // 这里再次获取后端sdl，是因为web网页在reload时要及时更新
    const backendTypeDefs1 = await fetchRemoteSchemaTypeDefs(endpoint.url)

    res.send({
      isAllAddComment: jsonSettings.isAllAddComment,
      typeDefs: backendTypeDefs1,
      maxDepth: jsonSettings.maxDepth,
      directive: jsonSettings.directive,
      localTypeDefs,
      workspaceGqlNames,
      workspaceGqlFileInfo,
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
        fillOperationInWorkspace(
          workspaceRes[0].filename,
          operationStr,
          workspaceRes[0].document,
          jsonSettings.isAllAddComment,
        )
        res.send({ message: '一键填入成功' })
      }
    } catch (error) {
      res.status(406).send({ message: error })
    }
  })

  app.post('/multiple', async (req, res) => {
    const { info, gql } = req.body

    info.forEach((infoItm: GetWorkspaceGqlFileInfoReturnType) => {
      fillOperationInWorkspace(infoItm.filename, gql, infoItm.document, jsonSettings.isAllAddComment)
    })
    res.send({ message: '一键填入成功' })
  })

  app.use(express.static(path.resolve(__dirname, '../dist-page-view')))

  // 监听本地端口号是否可用
  try {
    await portscanner.findAPortNotInUse([port])
    const expressServer = app.listen(port, () => {
      console.log(`Server listening on port http://localhost:${port}/graphql`)
    })

    return expressServer
  } catch (error) {
    throw new Error(`Port ${port} is already in use.`)
  }
}
