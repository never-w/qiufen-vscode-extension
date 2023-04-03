import * as vscode from 'vscode'
import { ApolloServer } from '@apollo/server'
import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'
import { json } from 'body-parser'
import express from 'express'
import path from 'path'
import fetchRemoteSchemaTypeDefs from '@/utils/fetchRemoteSchemaTypeDefs'
import { getWorkspaceAllGqlResolveFilePaths, getWorkspaceGqlFileInfo } from '@/utils/syncWorkspaceGqls'
import readLocalSchemaTypeDefs from '@/utils/readLocalSchemaTypeDefs'
import getIpAddress from '@/utils/getIpAddress'
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
  app.use(json())

  app.get('/operations', async (req, res) => {
    const resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
    const workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
    const workspaceGqlNames = workspaceGqlFileInfo.map((itm) => itm.operationNames).flat(Infinity) as string[]
    const localTypeDefs = readLocalSchemaTypeDefs()
    // 这里再次获取后端sdl，是因为web网页在reload时要及时更新
    const backendTypeDefs1 = await fetchRemoteSchemaTypeDefs(endpoint.url)

    res.send({
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

  // TODO:
  app.post('/my-route', (req, res) => {
    const myStringParam = req.body.myStringParam
    console.log(req, ' +++')

    console.log('Received string parameter:', myStringParam)
    res.send('String parameter received')
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
