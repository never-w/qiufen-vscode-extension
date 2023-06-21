import React from 'react'
// eslint-disable-next-line import/order
import ReactDOM from 'react-dom'

import './index.css'
import { HashRouter } from 'react-router-dom'

import App from './App'

ReactDOM.render(
  <HashRouter>
    <App />
  </HashRouter>,
  document.getElementById('root'),
)
