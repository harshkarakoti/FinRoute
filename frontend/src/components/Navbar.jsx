import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiZap } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-surface-700"
      style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <FiZap size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gradient">FinRoute</span>
        </Link>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-200">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <button onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-surface-700 text-slate-400 hover:text-red-400 transition-colors"
              title="Logout">
              <FiLogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
