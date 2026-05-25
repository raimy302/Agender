/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "auth_token";


type LoginResponse = {
  access_token: string;
  token_type?: string;
};

function sanitizeEmail(v: string) {
  return v.trim().toLowerCase();
}

function isBasicEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSafe = useMemo(() => sanitizeEmail(email), [email]);

  useEffect(() => {
    setError(null);
  }, [emailSafe, password]);

  const handleSubmit = async () => {
    setError(null);

    if (!isBasicEmail(emailSafe)) {
      setError("Email inválido.");
      return;
    }

    const pwd = password;
    if (!pwd || pwd.length < 4) {
      setError("Password inválido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailSafe, password: pwd }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const payload: unknown = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof payload === "object" && payload && "detail" in (payload as any)
            ? String((payload as any).detail)
            : typeof payload === "string"
              ? payload
              : "Error iniciando sesión";
        throw new Error(msg);
      }

      const data = payload as LoginResponse;
      if (!data?.access_token) throw new Error("Respuesta inválida del servidor");

      window.localStorage.setItem(TOKEN_KEY, data.access_token);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error iniciando sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 440,
          maxWidth: "100%",
          border: "1px solid rgba(148,163,184,0.25)",
          background: "linear-gradient(180deg, rgba(2,6,23,0.5), rgba(2,6,23,0.2))",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Admin</div>
            <h1 style={{ margin: "8px 0 0" }}>Iniciar sesión</h1>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, textAlign: "right" }}>Demo MVP</div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 14,
              background: "rgba(239,68,68,0.16)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#fca5a5",
              padding: 12,
              borderRadius: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.45)",
                color: "white",
                padding: "0 12px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              style={{
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.45)",
                color: "white",
                padding: "0 12px",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 4,
              height: 46,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(34,197,94,0.9))",
              color: "#0b1220",
              fontWeight: 900,
              letterSpacing: 0.2,
            }}
          >
            {loading ? "Iniciando..." : "Iniciar sesión"}
          </button>

          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
            Tip: usa el admin que hayas creado en el backend.
          </div>
        </div>
      </div>
    </div>
  );
}

