import { startMockingServer } from '@fruits-chain/qiufen-pro-graphql-mock'
import portscanner from 'portscanner'
import * as vscode from 'vscode'

import type { GraphqlKitConfig } from '@fruits-chain/qiufen-pro-graphql-mock'

export async function startMockServer(qiufenConfigs: GraphqlKitConfig) {
  try {
    await portscanner.findAPortNotInUse([qiufenConfigs?.port])
  } catch (error) {
    throw new Error(`Mocking port ${qiufenConfigs?.port} is already in use...`)
  }

  try {
    const { startStandaloneServer: startStandaloneServer1, server } =
      await startMockingServer(qiufenConfigs)
    const url = await startStandaloneServer1()
    vscode.window.showInformationMessage(
      `🚀 Mocking server listening at: ${url}`,
    )
    return server
  } catch (err) {
    throw new Error(err as any)
  }
}
