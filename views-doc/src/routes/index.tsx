import React from 'react'
import Layout from '@/components/layout'
import NotFound from '@/pages/not-found'
import { RouteObject } from 'react-router-dom'

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: '/courses',
        element: <Courses />,
        // children: [
        //   { index: true, element: <CoursesIndex /> },
        //   { path: '/courses/:id', element: <Course /> },
        // ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export default routes
