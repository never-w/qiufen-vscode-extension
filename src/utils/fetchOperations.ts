import { UrlLoader } from "@graphql-tools/url-loader"
import { loadSchema } from "@graphql-tools/load"
import { getOperationsBySchema } from "@fruits-chain/qiufen-helpers"

export default async function fetchOperations() {
  const schema = await loadSchema("http://192.168.10.233:9406/graphql", {
    loaders: [new UrlLoader()],
  })
  const operations = getOperationsBySchema(schema)
  return operations
}
