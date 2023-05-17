import React from 'react'
import NotFound from '@/pages/not-found'
import { RouteObject } from 'react-router-dom'
import Layout from '@/layout'
import OperationsContent from '@/pages/operations-content'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <OperationsContent />,
      },
      {
        path: '/home',
        element: <p>home page</p>,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]

export default routes
