import useBearStore from '@/stores'
import { buildSchema, findBreakingChanges } from 'graphql'
import React, { FC, useMemo, useState } from 'react'

interface IProps {}

const Home: FC<IProps> = () => {
  const { captureMessage, typeDefs, localTypeDefs } = useBearStore((state) => state)
  const [loading, setLoading] = useState(false)

  useMemo(async () => {
    setLoading(true)
    await captureMessage()
    setLoading(false)
  }, [captureMessage])

  //   const [leftSchema, rightSchema] = useMemo(() => {
  //     let result = [] as GraphQLSchema[]

  //     if (typeDefs && localTypeDefs) {
  //       const schemaRemote = buildSchema(typeDefs)
  //       const schemaLocal = buildSchema(localTypeDefs)
  //       result = [schemaRemote, schemaLocal]
  //     }

  //     return result
  //   }, [localTypeDefs, typeDefs])

  useMemo(() => {
    if (typeDefs && localTypeDefs) {
      console.log(findBreakingChanges(buildSchema(localTypeDefs), buildSchema(typeDefs)))
    }
  }, [])

  return <div>home</div>
}

export default Home
