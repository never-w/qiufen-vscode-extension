import { UrlLoader } from "@graphql-tools/url-loader"
import { loadSchema } from "@graphql-tools/load"
import { getOperationsBySchema } from "@fruits-chain/qiufen-helpers"

export default async function fetchOperations(endpointUrl: string) {
  const schema = await loadSchema(endpointUrl, {
    loaders: [new UrlLoader()],
  })
  const operations = getOperationsBySchema(schema)
  return operations
}
