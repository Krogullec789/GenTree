import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { TreeProvider } from './store/TreeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TreeProvider>
      <App />
    </TreeProvider>
  </React.StrictMode>,
)
