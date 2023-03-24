interface GraphqlKitConfig {
  /** your qiufen service port */
  port: number
  /** backend service config */
  endpoint: ServiceConfig
  /** local graphql schema file path */
  localSchemaFile?: string
  /** use either local schema or remote schema, if unset, remote will be used */
  schemaPolicy?: SchemaPolicy
  /** mock config */
  mock?: MockConfig
  /** playground config */
  playground?: PlaygroundConfig
}

interface ServiceConfig {
  /** backend service url */
  url: string
}

interface MockConfig {
  /** enable the mock ability while it's true */
  enable: boolean
  /** the default value of enable arg in mock directive, default is true */
  mockDirectiveDefaultEnableValue: boolean
  /** schema files used for dev env, valid when enable is true */
  schemaFiles?: string[]
  /** value map rules, you should add all your scalar type mappers here or you'll get an error */
  scalarMap: any
  /** context for mock script in mock directive */
  context?: Record<string, unknown>
  /** graphql resolvers for operations, you can custom operation response here */
  resolvers?: any
}

type SchemaPolicy = 'local' | 'remote'

interface PlaygroundConfig {
  /** request headers */
  headers?: Record<string, string>
}
