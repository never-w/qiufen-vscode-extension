import React from 'react'

import Layout from '@/layout'
import DocContent from '@/pages/doc-content'
import Home from '@/pages/home'
import NoMatch from '@/pages/no-match'
import SideContent from '@/pages/side-content'

import type { RouteObject } from 'react-router-dom'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <SideContent />,
      },
      {
        path: '/docs',
        element: <SideContent />,
        children: [
          {
            path: '/docs/:id',
            element: <DocContent />,
          },
        ],
      },
      {
        path: '/home',
        element: <Home />,
      },
    ],
  },
  {
    path: '*',
    element: <NoMatch />,
  },
]

export default routes
