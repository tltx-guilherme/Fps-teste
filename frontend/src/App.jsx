import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Auditoria from "./pages/Auditoria";
import { isAuthed, isAdmin } from "./utils/auth";

function ProtectedRoute({ children, adminOnly = false }) {
  const authed = isAuthed();
  const userIsAdmin = isAdmin();

  if (!authed) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !userIsAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
 
export default function App() {
  const [authed, setAuthed] = useState(false);
  
  useEffect(() => {
    setAuthed(isAuthed());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={authed ? <Navigate to="/" replace /> : <Login onSuccess={() => setAuthed(true)} />} 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/auditoria"
          element={
            <ProtectedRoute adminOnly>
              <Auditoria />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
