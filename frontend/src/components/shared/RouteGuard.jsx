import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RouteGuard({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner spinner-lg"></div>
        <span>Authenticating...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
