import express from "express"
import { graphqlHTTP } from "express-graphql"
import { addMocksToSchema } from "./addMocksToSchema"
import type { GraphQLSchema } from "graphql"
import type { GraphqlKitConfig } from "./interface"
import { getOperationsBySchema } from "@/utils/operation"

export const BASE_PATH = "/graphql"

/**
 * create a graphql controller
 * @param config
 * @param ip
 */
const createGraphqlController = async (config: GraphqlKitConfig, rawSchema: GraphQLSchema) => {
  const router = express.Router()
  const { mock } = config

  // serve operations
  router.use(`${BASE_PATH}/operations`, async (req, res) => {
    const result = getOperationsBySchema(rawSchema, mock?.scalarMap)
    res.send({
      code: 200,
      message: "success",
      data: result,
    })
  })

  const mockedSchema = addMocksToSchema({
    schema: rawSchema,
    scalarMap: mock?.scalarMap,
    resolvers: mock?.resolvers,
    preserveResolvers: true,
    globalContext: mock?.context,
  })
  const graphqlHTTPOptions = {
    schema: mockedSchema,
  }
  router.post(`${BASE_PATH}`, graphqlHTTP(graphqlHTTPOptions))
  return router
}

export default createGraphqlController
