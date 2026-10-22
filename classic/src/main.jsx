import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter } from '@tanstack/react-router'
import App from './App.jsx'
import { routeTree } from './routeTree.gen.ts'
//scss
import './styles/scss/style.scss';
import { Provider } from 'react-redux';
import store from './redux/store';
import { ThemeProvider } from './utils/theme-provider/theme-provider.jsx';

const router = createRouter({ routeTree });

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <ThemeProvider>
    <Provider store={store} >
      <App router={router} />
    </Provider>
  </ThemeProvider>
  // </React.StrictMode>,
)
