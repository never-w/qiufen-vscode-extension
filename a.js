const express = require("express")
const { ApolloServer } = require("apollo-server-express")
const Mock = require("mockjs")
const fetch = require("node-fetch")

const { Random } = Mock
const mock = {
  Int: () => Random.integer(0, 100),
  String: () => Random.ctitle(2, 4),
  ID: () => Random.id(),
  Boolean: () => Random.boolean(),
  BigDecimal: () => Random.integer(0, 1000000),
  Float: () => Random.float(0, 100),
  Date: () => Random.date(),
  DateTime: () => Random.datetime(),
  Long: () => Random.integer(0, 10000),
  NumberOrBoolOrStringOrNull: () => null,
  NumberOrString: () => null,
}

fetch("https://pitaya-test.hjfruit.cn/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
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
})
  .then((res) => {
    return res.json()
  })
  .then(({ data }) => {
    const backendTypeDefs = data._service.sdl

    const app = express()
    const server = new ApolloServer({ typeDefs: backendTypeDefs, mocks: mock })
    server.start().then(() => {
      server.applyMiddleware({ app })
      app.listen({ port: 5000 }, () => console.log("Now browse to http://localhost:5000" + server.graphqlPath))
    })
  })
