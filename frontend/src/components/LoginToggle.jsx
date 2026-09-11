import { useAuth } from '../context/AuthContext'

export default function LoginToggle() {
  const { role, setRole } = useAuth()
  return (
    <div className="login-toggle">
      <button 
        className={role === 'citizen' ? 'active' : ''}
        onClick={() => setRole('citizen')}
      >
        👤 Citizen
      </button>
      <button 
        className={role === 'authority' ? 'active' : ''}
        onClick={() => setRole('authority')}
      >
        🛡️ Authority
      </button>
    </div>
  )
}
