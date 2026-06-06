import { useEffect, useState } from "react";
import { FiLock, FiMail } from "react-icons/fi";

import {
  authEnabled,
  hasSupabaseConfig,
  requireAuthSetting,
  supabase,
} from "../services/supabase";
import { supabaseMessage } from "../utils/format";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(authEnabled);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authEnabled || !supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Sesion iniciada.");
  }

  if (requireAuthSetting && !hasSupabaseConfig) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-lock">
            <FiLock />
          </div>
          <p className="eyebrow">Configuracion pendiente</p>
          <h1>Conecta Supabase para activar login</h1>
          <p className="muted">
            RestoGuard esta listo para acceso privado, pero falta crear el
            archivo .env con la URL y anon key de Supabase.
          </p>
          <div className="notice warning">
            Mientras falten VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, no se
            mostrara el login real.
          </div>
          <div className="setup-steps">
            <div>
              <strong>1</strong>
              <span>Crea el proyecto y ejecuta supabase/restoguard.sql.</span>
            </div>
            <div>
              <strong>2</strong>
              <span>Copia .env.example como .env.</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Pega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Reinicia el servidor local.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authEnabled) return children;

  if (loading) {
    return (
      <div className="screen-center">
        <p className="muted">Cargando sesion...</p>
      </div>
    );
  }

  if (session) return children;

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand-lock">
          <FiLock />
        </div>
        <p className="eyebrow">Acceso privado</p>
        <h1>Ingresar a RestoGuard</h1>
        <p className="muted">
          Sistema para restaurantes, bares y cafeterias. El administrador crea
          tu usuario y asigna tu negocio.
        </p>

        {!hasSupabaseConfig && (
          <div className="notice warning">
            Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
          </div>
        )}

        <label className="field">
          <span>Correo</span>
          <div className="input-icon">
            <FiMail />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>

        {message && <div className="notice">{message}</div>}

        <button className="btn primary full" type="submit" disabled={submitting}>
          {submitting ? "Procesando..." : "Ingresar"}
        </button>

        <p className="micro">
          Si aun no tienes acceso, solicita tu cuenta al administrador del
          sistema.
        </p>
      </form>
    </div>
  );
}
