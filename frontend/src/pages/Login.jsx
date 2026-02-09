import { useState } from "react";
import decorEsq from "../assets/decor-esq.svg";
import decorDir from "../assets/decor-dir.svg";
import { apiPost } from "../utils/api";
import './Login.css';

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("admin@fps.local");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const data = await apiPost("auth/login", { email, password });
      localStorage.setItem("fps_token", data.token);
      if (data.user) {
        localStorage.setItem("fps_user", JSON.stringify(data.user));
      }
      onSuccess?.();
    } catch (e) {
      setErr(e?.message || "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <img src={decorEsq} alt="" className="decor decor-esq" />
      <img src={decorDir} alt="" className="decor decor-dir" />

      <div className="login-card">
        <div className="login-header">
          <h1>Bem-vindo ao FPS</h1>
          <p className="login-subtitle-header">Interface de Monitoramento</p>
        </div>
        <p className="login-subtitle">Entre com seus dados de acesso</p>

        <form onSubmit={submit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@fps.local"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && <p className="error-msg">{err}</p>}

          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <span className="spinner"></span>
                Entrando...
              </>
            ) : (
              <>
                Entrar
                <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>

          <a href="#" className="forgot">Esqueceu sua senha?</a>
        </form>
      </div>
    </div>
  );
}
