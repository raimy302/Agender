import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";




import Navbar from "../Components/Navbar";

type TrackStatus = "pending" | "completed" | "cancelled";


type TrackResponse = {
  turn_number: number;
  current_turn: number | null;
  remaining_turns: number | null;
  pending_turns_before_current_user?: number | null;
  status: TrackStatus | null;
  appointment_date: string | null;
  appointment?: {
    id?: number;
    client_name?: string;
    time_slot?: string;
  } | null;
  total_pending_today?: number;
};

const API_URL = "http://127.0.0.1:8000";

const REFRESH_MS = 5000;

function clampNonNeg(n: number) {
  return n < 0 ? 0 : n;
}

export default function TrackTurn() {
  const { turn } = useParams();
  const navigate = useNavigate();

const agenderIconUrl = "/src/assets/agender-icon.png";

  // QR individual eliminado: el tracking queda como experiencia visual (no escaneo)

  const handleGoHome = () => navigate("/");


  const turnNumber = (() => {
    const parsed = Number(turn);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrackResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrack = async () => {
    if (!turnNumber) return;

    setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/track/${turnNumber}`);
      const contentType = res.headers.get("content-type") ?? "";
      const payload: unknown = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const obj = payload as Record<string, unknown>;
        const detail = obj?.detail;
        const messageValue = obj?.message;

        const msg =
          typeof detail === "string"
            ? detail
            : typeof messageValue === "string"
              ? messageValue
              : "Error consultando turno";
        throw new Error(msg);
      }

      const p = payload as TrackResponse;
      setData(p);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error consultando turno";
      setError(msg);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!turnNumber) return;

    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchTrack();
    };

    run();

    const id = window.setInterval(() => {
      if (cancelled) return;
      fetchTrack();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnNumber]);

  const currentTurn = data?.current_turn ?? null;
  const remaining = data?.remaining_turns ?? null;
  const status = data?.status ?? null;

  const pendingBeforeMe =
    typeof data?.pending_turns_before_current_user === "number"
      ? data.pending_turns_before_current_user
      : null;

  const ETA_MIN_PER_TURN = 5;
  const etaMinutes = pendingBeforeMe == null ? null : pendingBeforeMe * ETA_MIN_PER_TURN;

  const progressPct = useMemo(() => {
    if (remaining == null) return 0;

    const totalPending = typeof (data as TrackResponse | null)?.total_pending_today === "number"
      ? (data as TrackResponse).total_pending_today
      : null;

    if (totalPending != null && totalPending > 0) {
      const done = totalPending - remaining;
      const pct = (done / totalPending) * 100;
      return clampNonNeg(Math.min(100, pct));
    }

    if (currentTurn == null) return 0;
    return clampNonNeg((1 - remaining / Math.max(1, turnNumber ?? 1)) * 100);
  }, [remaining, currentTurn, turnNumber, data]);

  const message = useMemo(() => {
    if (status === "completed") return "Ya es tu turno. ¡Gracias!";
    if (status === "cancelled") return "Tu turno fue cancelado.";
    if (remaining == null) return "Preparándote…";
    if (remaining === 0) return "Ya casi te toca";
    if (remaining > 0) return `Faltan ${remaining} turnos para el tuyo`;
    return "Prepárate, pronto será tu turno";
  }, [remaining, status]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, opacity: 0.9 }}>Cargando seguimiento…</div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Actualizando cada 5s</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
          color: "white",
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 520, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 12, marginBottom: 12 }}>
            <button
              type="button"
              onClick={handleGoHome}
              aria-label="Ir a Agender Home"
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                border: "1px solid rgba(59,130,246,0.25)",
                background: "rgba(2,6,23,0.35)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                cursor: "pointer",
                boxShadow: "0 0 46px rgba(59,130,246,0.16)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={agenderIconUrl} alt="" style={{ width: 22, height: 22, opacity: 0.95 }} />
            </button>
          </div>

          <h2 style={{ marginTop: 0 }}>No se pudo encontrar el turno</h2>
          <p style={{ opacity: 0.9 }}>{error}</p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 14,
            }}
          >
            <button
              type="button"
              onClick={handleGoHome}
              aria-label="Volver al inicio"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148,163,184,0.25)",
                color: "white",
                padding: "10px 14px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 900,
                letterSpacing: 0.2,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px rgba(59,130,246,0.10)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                transition:
                  "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(59,130,246,0.18), 0 0 38px rgba(59,130,246,0.20)";
                e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px rgba(59,130,246,0.10)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            >
              <span aria-hidden="true" style={{ marginRight: 8 }}>
                ←
              </span>
              Volver al inicio
            </button>

            <button
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 1000,
                letterSpacing: 0.2,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 50px rgba(37,99,235,0.22)",
                transition: "transform 180ms ease, filter 180ms ease",
              }}
              onClick={() => navigate("/book/1")}
            >
              Volver a reservar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
        color: "white",
        padding: 20,
        boxSizing: "border-box",
        paddingTop: 90,
      }}
    >
      <Navbar />

      <main
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          border: "1px solid rgba(148,163,184,0.25)",
          background: "linear-gradient(180deg, rgba(2,6,23,0.4), rgba(2,6,23,0.2))",
          borderRadius: 18,
          padding: 22,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Seguimiento público</div>
            <h1 style={{ margin: "8px 0 0" }}>Turno</h1>
          </div>


          <button
            type="button"
            onClick={handleGoHome}
            aria-label="Volver al inicio"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              padding: "10px 14px",
              border: "1px solid rgba(148,163,184,0.25)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              cursor: "pointer",
              fontWeight: 900,
              letterSpacing: 0.2,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px rgba(59,130,246,0.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              transition:
                "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 0 0 1px rgba(59,130,246,0.18), 0 0 38px rgba(59,130,246,0.22)";
              e.currentTarget.style.background = "rgba(255,255,255,0.09)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
              e.currentTarget.style.boxShadow =
                "0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px rgba(59,130,246,0.12)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
              ←
            </span>
            Volver al inicio
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "none" }} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Tu turno</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.2 }}>{turnNumber}</div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 14, gridTemplateColumns: "1fr" }}>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                marginBottom: 14,
                padding: 16,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background:
                  "linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.18))",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 24px 70px rgba(59,130,246,0.10)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      fontWeight: 900,
                      letterSpacing: 0.2,
                    }}
                  >
                    Seguimiento en tiempo real
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 4 }}>
                    Tu turno: #{turnNumber ?? "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Estado</div>
                  <div style={{ fontSize: 18, fontWeight: 1000 }}>{status ?? "—"}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                inset: -1,
                borderRadius: 14,
                pointerEvents: "none",
                background:
                  "radial-gradient(800px circle at 10% 10%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(800px circle at 90% 30%, rgba(34,197,94,0.16), transparent 38%)",
                opacity: 0.9,
              }}
            />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Turno actual</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{currentTurn ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Tu turno</div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.3 }}>{turnNumber}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(59,130,246,0.08)",
                    boxShadow: "0 0 30px rgba(59,130,246,0.12)",
                    minWidth: 240,
                    flex: "1 1 240px",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Personas delante</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {pendingBeforeMe == null ? "—" : pendingBeforeMe}
                    <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}> personas</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(34,197,94,0.08)",
                    boxShadow: "0 0 30px rgba(34,197,94,0.10)",
                    minWidth: 220,
                    flex: "1 1 220px",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.7 }}>⏳ Tiempo aproximado</div>
                  <div style={{ fontSize: 22, fontWeight: 900 }}>
                    {etaMinutes == null ? "—" : `${etaMinutes} min`}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
              <div
                style={{
                  height: 12,
                  borderRadius: 999,
                  background: "rgba(148,163,184,0.15)",
                  border: "1px solid rgba(148,163,184,0.15)",
                  overflow: "hidden",
                  boxShadow: "0 0 40px rgba(59,130,246,0.08)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.max(3, Math.min(100, progressPct))}%`,
                    background:
                      "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(34,197,94,0.90))",
                    transition: "width 400ms ease",
                  }}
                />
              </div>
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{message}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Estado actual</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{status ?? "—"}</div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                {data?.appointment_date ? `Fecha: ${data.appointment_date}` : ""}
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{refreshing ? "Actualizando…" : "Actualizado"}</div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.65 }}>Si tu turno no aparece, reintenta más tarde.</div>
      </main>
    </div>
  );
}



