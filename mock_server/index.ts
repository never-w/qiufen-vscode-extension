import path from 'path'

import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { fetchTypeDefs } from '@fruits-chain/qiufen-pro-helpers'
import { addMocksToSchema } from '@graphql-tools/mock'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { json } from 'body-parser'
import cors from 'cors'
import express from 'express'
import { buildSchema, printSchema, lexicographicSortSchema } from 'graphql'
import portscanner from 'portscanner'
import * as vscode from 'vscode'

import getIpAddress from './utils/getIpAddress'
import readLocalSchemaTypeDefs from './utils/readLocalSchemaTypeDefs'
import {
  getWorkspaceAllGqlResolveFilePaths,
  getWorkspaceGqlFileInfo,
  getWorkspaceGqls,
  fillOperationInWorkspace,
} from './utils/syncWorkspaceGqls'

import type {
  GetWorkspaceGqlFileInfoReturnType,
  ReturnTypeGetWorkspaceGqlFileInfo,
} from './utils/syncWorkspaceGqls'
import type { GraphqlKitConfig } from '@fruits-chain/qiufen-pro-graphql-mock'
import type { GraphQLSchema } from 'graphql'

export async function startServer(config: GraphqlKitConfig) {
  const { endpoint, port, mock } = config
  const jsonSettings = vscode.workspace.getConfiguration('graphql-qiufen-pro')

  const app = express()

  let backendTypeDefs = await fetchTypeDefs(endpoint.url)

  const server = new ApolloServer({
    schema: addMocksToSchema({
      schema: makeExecutableSchema({ typeDefs: backendTypeDefs }),
      mocks: mock?.scalarMap,
    }),
  })

  // 获取响应时的相关数据
  let resolveGqlFiles: string[] = []
  let workspaceGqlFileInfo: ReturnTypeGetWorkspaceGqlFileInfo = []
  let workspaceGqlNames: string[] = []
  let localTypeDefs = ''
  let sortLocalSchema: GraphQLSchema
  let sortRemoteSchema: GraphQLSchema
  let newLocalTypeDefs = ''
  let newRemoteTypeDefs = ''

  resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
  workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
  workspaceGqlNames = workspaceGqlFileInfo
    .map(itm => itm.operationNames)
    .flat(Infinity) as string[]
  localTypeDefs = readLocalSchemaTypeDefs(
    jsonSettings.patternSchemaRelativePath,
  )
  // 排序
  sortLocalSchema = lexicographicSortSchema(buildSchema(localTypeDefs))
  sortRemoteSchema = lexicographicSortSchema(buildSchema(backendTypeDefs))
  // 重新转成sdl
  newLocalTypeDefs = printSchema(sortLocalSchema)
  newRemoteTypeDefs = printSchema(sortRemoteSchema)

  // 启动服务
  await server.start()
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(server),
  )
  app.use(cors())
  app.use(json({ limit: Infinity }))

  app.get('/operations', async (req, res) => {
    res.send({
      isAllAddComment: jsonSettings.isAllAddComment,
      typeDefs: newRemoteTypeDefs,
      maxDepth: jsonSettings.maxDepth,
      directive: jsonSettings.directive,
      localTypeDefs: newLocalTypeDefs,
      workspaceGqlNames,
      workspaceGqlFileInfo,
      port,
      IpAddress: getIpAddress(),
    })
  })

  app.get('/reload/operations', async (req, res) => {
    // 这里再次获取后端sdl，是因为web网页在reload时要及时更新
    backendTypeDefs = await fetchTypeDefs(endpoint.url)
    resolveGqlFiles = getWorkspaceAllGqlResolveFilePaths()
    workspaceGqlFileInfo = getWorkspaceGqlFileInfo(resolveGqlFiles)
    workspaceGqlNames = workspaceGqlFileInfo
      .map(itm => itm.operationNames)
      .flat(Infinity) as string[]
    localTypeDefs = readLocalSchemaTypeDefs(
      jsonSettings.patternSchemaRelativePath,
    )
    // 排序
    sortLocalSchema = lexicographicSortSchema(buildSchema(localTypeDefs))
    sortRemoteSchema = lexicographicSortSchema(buildSchema(backendTypeDefs))
    // 重新转成sdl
    newLocalTypeDefs = printSchema(sortLocalSchema)
    newRemoteTypeDefs = printSchema(sortRemoteSchema)

    res.send({
      isAllAddComment: jsonSettings.isAllAddComment,
      typeDefs: newRemoteTypeDefs,
      maxDepth: jsonSettings.maxDepth,
      directive: jsonSettings.directive,
      localTypeDefs: newLocalTypeDefs,
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

    info.forEach((infoItm: GetWorkspaceGqlFileInfoReturnType) => {
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

  // 监听本地端口号是否可用
  try {
    await portscanner.findAPortNotInUse([port])
    const expressServer = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port http://localhost:${port}/graphql`)
    })

    return expressServer
  } catch (error) {
    throw new Error(`Port ${port} is already in use.`)
  }
}
