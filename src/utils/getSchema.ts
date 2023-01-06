import { UrlLoader } from "@graphql-tools/url-loader"
import { loadSchema } from "@graphql-tools/load"

export default async function getSchema(endpointUrl: string) {
  const schema = await loadSchema(endpointUrl, {
    loaders: [new UrlLoader()],
  })
  return schema
}
