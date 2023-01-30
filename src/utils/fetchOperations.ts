import * as vscode from "vscode"
import { UrlLoader } from "@graphql-tools/url-loader"
import { loadSchema } from "@graphql-tools/load"
import { getOperationsBySchema } from "@fruits-chain/qiufen-helpers"
import { GraphQLSchema } from "graphql"

export default async function fetchOperations(endpointUrl = "") {
  let schema: GraphQLSchema

  if (!endpointUrl) {
    vscode.window.showErrorMessage("gql-doc 请配置schema地址！！！")
    return
  }

  try {
    schema = await loadSchema(endpointUrl, {
      loaders: [new UrlLoader()],
    })
    const operations = getOperationsBySchema(schema)
    return operations
  } catch {
    vscode.window.showErrorMessage("gql-doc 网络出错啦或者schema地址配置错误！！！")
  }
}
