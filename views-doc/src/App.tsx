import React from 'react'
import { useRoutes } from 'react-router-dom'

import routes from './routes'

import type { FC } from 'react'

interface IProps {}

const App: FC<IProps> = () => {
  const element = useRoutes(routes)

  return <div>{element}</div>
}

export default App
