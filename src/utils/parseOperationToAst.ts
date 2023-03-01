import { parse } from "graphql"

/**
 *
 * @param operation gql接口
 */
function parseOperationToAst(operation: string) {
  return parse(operation, { noLocation: true })
}

export default parseOperationToAst
