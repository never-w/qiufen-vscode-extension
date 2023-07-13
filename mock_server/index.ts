import path from 'path'

import { startMockingServer } from '@fruits-chain/qiufen-pro-graphql-mock'
import portscanner from 'portscanner'
import * as vscode from 'vscode'

import type { GraphqlKitConfig } from '@fruits-chain/qiufen-pro-graphql-mock'

export async function startMockServer(
  qiufenConfigs: GraphqlKitConfig,
  localSchemaFilePath: string,
) {
  try {
    await portscanner.findAPortNotInUse([qiufenConfigs?.port])
  } catch (error) {
    throw new Error(`Mocking port ${qiufenConfigs?.port} is already in use...`)
  }

  try {
    const workspaceRootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath // 工作区根目录
    const localSchemaFile = path.join(
      workspaceRootPath!,
      localSchemaFilePath || '',
    ) // 工作区根目录

    const { startStandaloneServer: startStandaloneServer1, server } =
      await startMockingServer(qiufenConfigs, localSchemaFile)
    const url = await startStandaloneServer1()
    vscode.window.showInformationMessage(
      `🚀 Mocking server listening at: ${url}`,
    )
    return server
  } catch (err) {
    throw new Error(err as any)
  }
}
