import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Toast from './components/shared/Toast'
import RouteGuard from './components/shared/RouteGuard'
import Login from './pages/Login'
import UserDashboard from './pages/UserDashboard'
import DBADashboard from './pages/DBADashboard'
import AdminDashboard from './pages/AdminDashboard'
import Unauthorized from './pages/Unauthorized'
import LandingPage from './pages/LandingPage'
import ChangePassword from './pages/ChangePassword'

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />

        <Route
          path="/user/dashboard"
          element={
            <RouteGuard allowedRoles={['user']}>
              <UserDashboard />
            </RouteGuard>
          }
        />

        <Route
          path="/dba/dashboard"
          element={
            <RouteGuard allowedRoles={['dba']}>
              <DBADashboard />
            </RouteGuard>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <RouteGuard allowedRoles={['admin']}>
              <AdminDashboard />
            </RouteGuard>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
