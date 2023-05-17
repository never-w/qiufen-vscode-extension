import { FC } from 'react'
import React from 'react'
import routes from './routes'
import { useRoutes } from 'react-router-dom'

interface IProps {}

const App: FC<IProps> = () => {
  const element = useRoutes(routes)

  return <div>{element}</div>
}

export default App
