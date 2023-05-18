import { findBreakingChanges, findDangerousChanges, DangerousChange, BreakingChange } from 'graphql'
import { buildSchema, lexicographicSortSchema } from 'graphql/utilities'
// import disparity from 'disparity'
import { printSchemaWithDirectives } from '@graphql-tools/utils'

export type Headers = Record<string, string>

export interface DiffResponse {
  // diff: string
  // diffNoColor: string
  // dangerousChanges: DangerousChange[]
  breakingChanges: BreakingChange[]
}

export interface DiffOptions {
  sortSchema?: boolean
}

export async function getDiff(
  leftSchemaLocation: string,
  rightSchemaLocation: string,
  options: DiffOptions = {},
): Promise<DiffResponse | undefined> {
  let [leftSchema, rightSchema] = [buildSchema(leftSchemaLocation), buildSchema(rightSchemaLocation)]

  if (!leftSchema || !rightSchema) {
    throw new Error('Schemas not defined')
  }

  if (options?.sortSchema) {
    ;[leftSchema, rightSchema] = [lexicographicSortSchema(leftSchema), lexicographicSortSchema(rightSchema)]
  }

  const [leftSchemaSDL, rightSchemaSDL] = [
    printSchemaWithDirectives(leftSchema),
    printSchemaWithDirectives(rightSchema),
  ]

  if (leftSchemaSDL === rightSchemaSDL) {
    return
  }

  // const dangerousChanges = findDangerousChanges(leftSchema, rightSchema)
  const breakingChanges = findBreakingChanges(leftSchema, rightSchema)

  return {
    // dangerousChanges: [],
    breakingChanges,
  }
}
