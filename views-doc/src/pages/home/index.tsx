import useBearStore from '@/stores'
import { findBreakingChanges } from '@/utils/schemaDiff'
import { buildSchema } from 'graphql'
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

  useMemo(() => {
    if (typeDefs && localTypeDefs) {
      const [leftSchema, rightSchema] = [buildSchema(localTypeDefs), buildSchema(typeDefs)]

      // const oldArr = Object.values(leftSchema.getTypeMap())
      // const newArr = Object.values(rightSchema.getTypeMap())
      // console.log(diff(oldArr, newArr).persisted[8][0], diff(oldArr, newArr).persisted[8][1])

      // const _old = (diff(oldArr, newArr).persisted[8][0] as GraphQLObjectType).getFields()
      // const _new = (diff(oldArr, newArr).persisted[8][1] as GraphQLObjectType).getFields()

      // console.log(diff(Object.values(_old), Object.values(_new)))

      // console.log(oldArr, ' oldArr')
      // console.log(newArr, ' newArr')

      console.log(findBreakingChanges(leftSchema, rightSchema), '   findBreakingChanges')
      // console.log(findDangerousChanges(leftSchema, rightSchema), '   findDangerousChanges')
    }
  }, [localTypeDefs, typeDefs])

  return <div>home</div>
}

export default Home
