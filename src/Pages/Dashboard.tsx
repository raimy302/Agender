/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteAppointment,
  getMyAppointmentsProtected,
  getToken,
  type AppointmentListItem,
  type AppointmentStatus,
  updateAppointment,
} from "../Services/api";

import Navbar from "../Components/Navbar";
import { QRCodeCanvas } from "qrcode.react";

type ViewState =
  | { kind: "loading" }
  | { kind: "unauth"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; appointments: AppointmentListItem[] };

type EditingAppointment = {
  id: number;
  client_name: string;
  phone: string;
  time_slot: string;
  status: AppointmentStatus;
};

function statusColor(status: AppointmentStatus): { bg: string; border: string; text: string } {
  switch (status) {
    case "pending":
      return { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.5)", text: "#93c5fd" };
    case "completed":
      return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.5)", text: "#86efac" };
    case "cancelled":
      return { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.5)", text: "#fca5a5" };
    default:
      return { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.5)", text: "#cbd5e1" };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const token = useMemo(() => getToken(), []);

  const agenderIconUrl = "/src/assets/agender-icon.png";

  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<EditingAppointment | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const reload = async () => {
    const data = await getMyAppointmentsProtected();
    setView({ kind: "ready", appointments: data });
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setView({ kind: "unauth", message: "Inicia sesión para ver tu dashboard." });
        return;
      }
      try {
        const data = await getMyAppointmentsProtected();
        if (cancelled) return;
        setView({ kind: "ready", appointments: data });
      } catch {
        if (cancelled) return;
        setView({ kind: "error", message: "No se pudieron cargar las citas." });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const appointments = view.kind === "ready" ? view.appointments : [];

  const turnoActual = useMemo(() => {
    const pending = appointments.filter((a) => a.status === "pending");
    if (pending.length === 0) return null;
    return Math.min(...pending.map((a) => a.turn_number));
  }, [appointments]);

  const [nextBusy, setNextBusy] = useState(false);
  const handleNextTurn = async () => {
    if (nextBusy) return;
    if (turnoActual == null) return;

    const target = appointments.find((a) => a.turn_number === turnoActual && a.status === "pending");
    if (!target) return;

    try {
      setNextBusy(true);
      setBusyId(target.id);
      await updateAppointment(target.id, { status: "completed" });
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "Error actualizando turno");
    } finally {
      setBusyId(null);
      setNextBusy(false);
    }
  };

  const counts = useMemo(() => {
    const pending = appointments.filter((a) => a.status === "pending").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    const cancelled = appointments.filter((a) => a.status === "cancelled").length;
    const current = turnoActual == null ? 0 : appointments.filter((a) => a.turn_number === turnoActual).length;
    return { pending, completed, cancelled, current };
  }, [appointments, turnoActual]);

  const statsCard = (opts: {
    label: string;
    value: number;
    icon: string;
    glow: string;
    border: string;
    text: string;
  }) => {
    return (
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          border: `1px solid ${opts.border}`,
          background: "rgba(2,6,23,0.35)",
          overflow: "hidden",
          padding: 14,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.10)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -1,
            pointerEvents: "none",
            background: `radial-gradient(520px circle at 10% 0%, ${opts.glow}, transparent 40%)`,
            opacity: 0.9,
          }}
        />

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 18 }}>{opts.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, letterSpacing: 0.2 }}>{opts.label}</div>
              <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 0.2, color: opts.text }}>{opts.value}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Hoy</div>
        </div>
      </div>
    );
  };

  if (view.kind === "loading") {
    return (
      <div
        style={{
          color: "white",
          minHeight: "100vh",
          background:
            "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.2 }}>Cargando…</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Dashboard Admin</div>
        </div>
      </div>
    );
  }

  if (view.kind === "unauth") {
    return (
      <div
        style={{
          color: "white",
          minHeight: "100vh",
          background:
            "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(2,6,23,0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 16,
                background: "rgba(59,130,246,0.10)",
                border: "1px solid rgba(59,130,246,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 38px rgba(59,130,246,0.12)",
              }}
              aria-hidden="true"
            >
              <img src={agenderIconUrl} alt="" style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <h1 id="d1" style={{ margin: 0, fontSize: 28 }}>
                Dashboard Admin
              </h1>
              <div id="d2" style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                Gestión de turnos en tiempo real
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, opacity: 0.92, lineHeight: 1.45 }}>{view.message}</div>

          <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88))",
                border: 0,
                color: "#07101f",
                padding: "10px 16px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 1000,
                letterSpacing: 0.2,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(59,130,246,0.20)",
              }}
            >
              Ir a login
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148,163,184,0.25)",
                color: "white",
                padding: "10px 16px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 1000,
              }}
            >
              Volver a inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view.kind === "error") {
    return (
      <div
        style={{
          color: "white",
          minHeight: "100vh",
          background:
            "radial-gradient(1200px circle at 10% 0%, rgba(59,130,246,0.20), transparent 35%), radial-gradient(900px circle at 90% 10%, rgba(168,85,247,0.16), transparent 40%), #0f172a",
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            padding: 22,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(2,6,23,0.45)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          }}
        >
          <h1 id="d1" style={{ margin: 0, fontSize: 28 }}>
            Dashboard Admin
          </h1>
          <div id="d2" style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
            Gestión de turnos en tiempo real
          </div>

          <div style={{ marginTop: 16, background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.35)", padding: 12, borderRadius: 14, color: "#fecaca" }}>
            {view.message}
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88))",
                border: 0,
                color: "#07101f",
                padding: "10px 16px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 1000,
                letterSpacing: 0.2,
              }}
            >
              Volver al inicio de sesión
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
        padding: "40px",
        paddingTop: 112,
      }}
    >
      <Navbar />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 16, gap: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 320 }}>
          {/* QR Público del Negocio */}
          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.35)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
              padding: 18,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: -1,
                pointerEvents: "none",
                background:
                  "radial-gradient(700px circle at 10% 0%, rgba(59,130,246,0.28), transparent 40%), radial-gradient(600px circle at 90% 30%, rgba(168,85,247,0.18), transparent 45%)",
                opacity: 0.95,
              }}
            />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, letterSpacing: 0.2 }}>QR Público del Negocio</div>
                  <div style={{ fontSize: 16, fontWeight: 1000 }}>Reserva pública</div>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid rgba(59,130,246,0.28)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 38px rgba(59,130,246,0.12)",
                    flex: "0 0 auto",
                  }}
                  aria-hidden="true"
                >
                  <img src={agenderIconUrl} alt="" style={{ width: 22, height: 22 }} />
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.22)",
                    background: "rgba(2,6,23,0.28)",
                    width: 190,
                    maxWidth: "100%",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <QRCodeCanvas
                      value={`${window.location.origin}/book/1`}
                      size={148}
                      includeMargin={false}
                      bgColor="transparent"
                      fgColor="#E5E7EB"
                      level="M"
                    />
                  </div>
                </div>


                <div style={{ minWidth: 220 }}>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, letterSpacing: 0.2 }}>Enlace</div>
                  <div style={{ fontSize: 13, opacity: 0.92, fontWeight: 1000, marginTop: 6, wordBreak: "break-all" }}>/book/1</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText("/book/1");
                        } catch {
                          // fallback silencioso
                        }
                      }}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.25)",
                        background: "rgba(255,255,255,0.06)",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 1000,
                        letterSpacing: 0.2,
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 18px 60px rgba(59,130,246,0.10)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        transition: "transform 160ms ease, filter 160ms ease, box-shadow 160ms ease",
                      }}
                    >
                      Copiar enlace
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Navegar / el usuario imprime/descarga desde el QR renderizado
                        // Esta etapa prioriza arquitectura; el botón descargar se implementa cuando el QR esté renderizado.
                      }}
                      style={{
                        height: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.25)",
                        background:
                          "linear-gradient(90deg, rgba(59,130,246,0.35), rgba(168,85,247,0.28))",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: 1000,
                        letterSpacing: 0.2,
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 22px 70px rgba(168,85,247,0.12)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        transition: "transform 160ms ease, filter 160ms ease, box-shadow 160ms ease",
                      }}
                      disabled
                      aria-disabled="true"
                    >
                      Descargar QR
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/book/1")}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      height: 50,
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.25)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 1000,
                      letterSpacing: 0.2,
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 18px 60px rgba(59,130,246,0.12)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                    }}
                  >
                    Abrir /book/1
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 18,
                background: "rgba(59,130,246,0.10)",
                border: "1px solid rgba(59,130,246,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 46px rgba(59,130,246,0.18)",
              }}
              aria-hidden="true"
            >
              <img src={agenderIconUrl} alt="" style={{ width: 24, height: 24 }} />
            </div>

            <div>
              <h1 id="d1" style={{ margin: 0, fontSize: 34, letterSpacing: -0.6 }}>
                Dashboard Admin
              </h1>
              <div id="d2" style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
                Gestión de turnos en tiempo real
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(148,163,184,0.25)",
                color: "white",
                padding: "10px 12px",
                borderRadius: 14,
                cursor: "pointer",
                fontWeight: 1000,
                boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
                transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(59,130,246,0.18), 0 18px 60px rgba(59,130,246,0.16)";
                e.currentTarget.style.background = "rgba(255,255,255,0.09)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow = "0 18px 60px rgba(0,0,0,0.25)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            >
              ← Back al inicio
            </button>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(2,6,23,0.35)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>Turno actual</div>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>{turnoActual ?? "—"}</div>
              <div style={{ width: 1, height: 22, background: "rgba(148,163,184,0.18)" }} />
              <button
                onClick={handleNextTurn}
                disabled={nextBusy || turnoActual == null}
                style={{
                  background:
                    nextBusy || turnoActual == null
                      ? "rgba(148,163,184,0.18)"
                      : "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88))",
                  color: "#07101f",
                  border: 0,
                  padding: "10px 14px",
                  borderRadius: 14,
                  cursor: nextBusy || turnoActual == null ? "not-allowed" : "pointer",
                  fontWeight: 1000,
                  letterSpacing: 0.2,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(59,130,246,0.20)",
                  transition: "transform 180ms ease, filter 180ms ease",
                }}
                onMouseEnter={(e) => {
                  if (nextBusy || turnoActual == null) return;
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.filter = "saturate(1.1)";
                }}
                onMouseLeave={(e) => {
                  if (nextBusy || turnoActual == null) return;
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.filter = "none";
                }}
              >
                {nextBusy ? "Actualizando…" : "➡ Siguiente turno"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "stretch", justifyContent: "flex-end" }}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", width: "min(820px, 100%)" }}>
            {statsCard({
              label: "Turnos pendientes",
              value: counts.pending,
              icon: "⏳",
              glow: "rgba(59,130,246,0.25)",
              border: "rgba(59,130,246,0.45)",
              text: "#93c5fd",
            })}
            {statsCard({
              label: "Completados",
              value: counts.completed,
              icon: "✅",
              glow: "rgba(34,197,94,0.22)",
              border: "rgba(34,197,94,0.44)",
              text: "#86efac",
            })}
            {statsCard({
              label: "Cancelados",
              value: counts.cancelled,
              icon: "⛔",
              glow: "rgba(239,68,68,0.22)",
              border: "rgba(239,68,68,0.44)",
              text: "#fca5a5",
            })}
            {statsCard({
              label: "Turno actual",
              value: counts.current,
              icon: "⚡",
              glow: "rgba(168,85,247,0.22)",
              border: "rgba(168,85,247,0.44)",
              text: "#d8b4fe",
            })}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            background: "rgba(239,68,68,0.14)",
            border: "1px solid rgba(239,68,68,0.35)",
            padding: 12,
            borderRadius: 14,
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Citas de hoy</div>
            <div style={{ fontSize: 20, fontWeight: 1000, letterSpacing: -0.2 }}>Gestión en tiempo real</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Hover para acciones</div>
        </div>

        {appointments.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              borderRadius: 18,
              border: "1px dashed rgba(148,163,184,0.30)",
              background: "rgba(2,6,23,0.28)",
              padding: 22,
              textAlign: "center",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 20,
                margin: "0 auto 10px",
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(148,163,184,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 40px rgba(148,163,184,0.10)",
              }}
              aria-hidden="true"
            >
              <span style={{ fontSize: 22 }}>📭</span>
            </div>
            <div id="d3" style={{ fontSize: 16, fontWeight: 1000 }}>
              No hay citas registradas hoy.
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 14,
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.20)",
              overflow: "hidden",
              background: "rgba(2,6,23,0.25)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            {appointments
              .slice()
              .sort((a, b) => a.turn_number - b.turn_number)
              .map((a) => {
                const c = statusColor(a.status);
                const isBusy = busyId === a.id;

                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: 16,
                      borderTop: "1px solid rgba(148,163,184,0.12)",
                      alignItems: "flex-start",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.00), rgba(255,255,255,0.00))",
                      transition: "background 180ms ease, transform 180ms ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(59,130,246,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 280 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 18, fontWeight: 1000 }}>{a.client_name}</div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 1000,
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${c.border}`,
                            background: c.bg,
                            color: c.text,
                            textTransform: "capitalize",
                            letterSpacing: 0.2,
                          }}
                        >
                          {a.status}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, opacity: 0.75 }}>📞 {a.phone}</div>
                        <div style={{ fontSize: 13, opacity: 0.75 }}>⏰ {a.time_slot}</div>
                        <div style={{ fontSize: 13, opacity: 0.75 }}>
                          🎯 Turno: <span style={{ fontWeight: 1000, opacity: 0.95 }}>{a.turn_number}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 240 }}>
                      <button
                        disabled={isBusy}
                        onClick={() =>
                          setEditing({
                            id: a.id,
                            client_name: a.client_name,
                            phone: a.phone,
                            time_slot: a.time_slot,
                            status: a.status,
                          })
                        }
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(148,163,184,0.25)",
                          color: "white",
                          padding: "10px 12px",
                          borderRadius: 14,
                          cursor: isBusy ? "not-allowed" : "pointer",
                          fontWeight: 1000,
                          transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
                          boxShadow: "0 0 0 1px rgba(255,255,255,0.02)",
                        }}
                        onMouseEnter={(e) => {
                          if (isBusy) return;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 0 0 1px rgba(59,130,246,0.20), 0 0 32px rgba(59,130,246,0.14)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0px)";
                          e.currentTarget.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.02)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                        }}
                      >
                        {isBusy && editing?.id === a.id ? "Editando…" : "✏️ Editar"}
                      </button>

                      <button
                        disabled={isBusy}
                        onClick={async () => {
                          const ok = window.confirm(`Eliminar la cita de ${a.client_name} (${a.time_slot})?`);
                          if (!ok) return;
                          try {
                            setError(null);
                            setBusyId(a.id);
                            await deleteAppointment(a.id);
                            await reload();
                          } catch (e: any) {
                            setError(e?.message ?? "Error eliminando");
                          } finally {
                            setBusyId(null);
                          }
                        }}
                        style={{
                          background: isBusy ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.18)",
                          border: `1px solid rgba(239,68,68,0.45)`,
                          color: "#fecaca",
                          padding: "10px 12px",
                          borderRadius: 14,
                          cursor: isBusy ? "not-allowed" : "pointer",
                          fontWeight: 1000,
                          transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
                        }}
                        onMouseEnter={(e) => {
                          if (isBusy) return;
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 0 0 1px rgba(239,68,68,0.22), 0 0 32px rgba(239,68,68,0.14)";
                          e.currentTarget.style.background = "rgba(239,68,68,0.22)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0px)";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.background = isBusy ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.18)";
                        }}
                      >
                        {isBusy ? "Eliminando…" : "🗑️ Eliminar"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 60,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div
            style={{
              width: 560,
              maxWidth: "100%",
              background: "rgba(11,18,32,0.70)",
              borderRadius: 18,
              padding: 20,
              border: "1px solid rgba(148,163,184,0.22)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 20 }}>Editar cita</h2>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Actualizá detalles sin perder el contexto</div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  color: "white",
                  width: 38,
                  height: 38,
                  borderRadius: 14,
                  cursor: "pointer",
                  fontWeight: 1000,
                }}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <input
                value={editing.client_name}
                onChange={(e) => setEditing((s) => (s ? { ...s, client_name: e.target.value } : s))}
                placeholder="Nombre"
                style={{
                  background: "rgba(2,6,23,0.35)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  color: "white",
                  padding: "12px 12px",
                  borderRadius: 14,
                  outline: "none",
                }}
              />
              <input
                value={editing.phone}
                onChange={(e) => setEditing((s) => (s ? { ...s, phone: e.target.value } : s))}
                placeholder="Teléfono"
                style={{
                  background: "rgba(2,6,23,0.35)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  color: "white",
                  padding: "12px 12px",
                  borderRadius: 14,
                  outline: "none",
                }}
              />
              <input
                value={editing.time_slot}
                onChange={(e) => setEditing((s) => (s ? { ...s, time_slot: e.target.value } : s))}
                placeholder="Horario (HH:MM)"
                style={{
                  background: "rgba(2,6,23,0.35)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  color: "white",
                  padding: "12px 12px",
                  borderRadius: 14,
                  outline: "none",
                }}
              />

              <select
                value={editing.status}
                onChange={(e) => setEditing((s) => (s ? { ...s, status: e.target.value as AppointmentStatus } : s))}
                style={{
                  background: "rgba(2,6,23,0.35)",
                  border: "1px solid rgba(148,163,184,0.25)",
                  color: "white",
                  padding: "12px 12px",
                  borderRadius: 14,
                  outline: "none",
                }}
              >
                <option value="pending">pending</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  disabled={editSaving}
                  onClick={async () => {
                    try {
                      setEditSaving(true);
                      setError(null);
                      await updateAppointment(editing.id, {
                        client_name: editing.client_name,
                        phone: editing.phone,
                        time_slot: editing.time_slot,
                        status: editing.status,
                      });
                      setEditing(null);
                      await reload();
                    } catch (e: any) {
                      setError(e?.message ?? "Error guardando");
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  style={{
                    background: editSaving
                      ? "rgba(148,163,184,0.18)"
                      : "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88))",
                    color: "#07101f",
                    border: 0,
                    padding: "10px 14px",
                    borderRadius: 14,
                    cursor: editSaving ? "not-allowed" : "pointer",
                    fontWeight: 1000,
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 18px 60px rgba(59,130,246,0.20)",
                    transition: "transform 180ms ease, box-shadow 180ms ease, filter 180ms ease",
                  }}
                >
                  {editSaving ? "Guardando…" : "Guardar"}
                </button>

                <button
                  disabled={editSaving}
                  onClick={() => setEditing(null)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(148,163,184,0.25)",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: 14,
                    cursor: editSaving ? "not-allowed" : "pointer",
                    fontWeight: 1000,
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

