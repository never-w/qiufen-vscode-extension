import * as vscode from 'vscode'
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql'
import fetch from 'node-fetch'

async function fetchRemoteSchemaTypeDefs(url: string) {
  const jsonSettings = vscode.workspace.getConfiguration('graphql-qiufen-pro')
  const isIntrospectionMode = jsonSettings.isIntrospection

  let timer
  const response = await Promise.race([
    // 这里判断不同模式拉取schema
    isIntrospectionMode
      ? fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: getIntrospectionQuery().toString(),
          }),
        })
      : fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
        query sdl{
             _service{
                sdl
               }
            }
         `,
          }),
        }),

    new Promise(function (_, reject) {
      timer = setTimeout(() => reject(new Error('request timeout')), 15000)
    }),
  ])

  clearTimeout(timer)

  const { data } = await (response as any).json()

  // 这里判断一下走的什么模式拿到的远程的schema 定义
  const backendTypeDefs = isIntrospectionMode ? printSchema(buildClientSchema(data)) : (data._service.sdl as string)
  return backendTypeDefs
}

export default fetchRemoteSchemaTypeDefs
