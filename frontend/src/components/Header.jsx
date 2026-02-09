import { useNavigate } from 'react-router-dom';
import { isAdmin, logout } from '../utils/auth';

export default function Header({ title = "Interface FPS" }) {
  const navigate = useNavigate();
  const userIsAdmin = isAdmin();

  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600" />
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {userIsAdmin && (
          <button
            onClick={() => navigate('/auditoria')}
            className="px-3 py-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-md transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Auditoria
          </button>
        )}
        <button
          onClick={logout}
          className="text-sm underline"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
