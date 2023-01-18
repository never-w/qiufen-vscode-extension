import * as vscode from "vscode"
import { UrlLoader } from "@graphql-tools/url-loader"
import { loadSchema } from "@graphql-tools/load"
import { getOperationsBySchema } from "@fruits-chain/qiufen-helpers"
import { GraphQLSchema } from "graphql"

export default async function fetchOperations(endpointUrl: string) {
  let schema: GraphQLSchema

  if (!endpointUrl) {
    vscode.window.showErrorMessage("gql-doc 请配置schema地址！！！")
    return
  }

  try {
    schema = await loadSchema(endpointUrl, {
      loaders: [new UrlLoader()],
    })
  } catch (error: any) {
    vscode.window.showErrorMessage("gql-doc schema地址配置错误或者网络出错啦！！！")
  }

  const operations = getOperationsBySchema(schema!)
  return operations
}
