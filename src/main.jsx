import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { createBrowserRouter, RouterProvider, Navigate } from 'react-router'
import NotFoundPage from './NotFoundPage'
import SearchByDate from './components/SearchByDate.jsx'
import { getSession } from './auth'

function ProtectedSearch() {
  return getSession() ? <SearchByDate /> : <Navigate to="/" replace />;
}

const router = createBrowserRouter([
  {path: "/", element: <App />},
  {path:"/search", element: <ProtectedSearch />},
  {path:"*", element: <NotFoundPage />}
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
