import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { createAppointment, getSlots } from "../Services/api";
import { QRCodeCanvas } from "qrcode.react";


function sanitizeName(v: string) {

  return v.replace(/\s+/g, " ").trim();
}

function isValidPhone(v: string) {
  return /^\+?[0-9]{7,15}$/.test(v.trim());
}

const TURN_STORAGE_KEY = "my_turn_number";

export default function Book() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const userIdSafe = useMemo(() => {
    // MVP: user_id fijo=1, pero aceptamos param por compatibilidad
    const parsed = Number(userId);
    return Number.isFinite(parsed) ? String(parsed) : "1";
  }, [userId]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("");

  const [slots, setSlots] = useState<string[]>([]);
  const [turn, setTurn] = useState<number | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qrSeedTurn, setQrSeedTurn] = useState<number | null>(null);


  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setError(null);
      setLoadingSlots(true);
      try {
        const raw = window.localStorage.getItem(TURN_STORAGE_KEY);
        const parsed = raw ? Number(raw) : NaN;
        if (Number.isFinite(parsed)) {
          setTurn(parsed);
        } else {
          setTurn(null);
        }
      } catch {
        setTurn(null);
      }

      try {
        const dataSlots = await getSlots(userIdSafe);
        if (!cancelled) setSlots(dataSlots);
      } catch {
        if (!cancelled) setError("No se pudieron cargar los horarios.");
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [userIdSafe]);

  // En esta etapa MVP mantenemos el flujo estable: el back no expone current_turn aquí.
  const turnoActual = undefined;

  useEffect(() => {

  }, []);

  const faltan = useMemo(() => {
    if (turnoActual == null || turn == null) return null;
    const diff = turn - turnoActual;
    return diff > 0 ? diff : 0;
  }, [turnoActual, turn]);

  const handleSubmit = async () => {
    setError(null);

    const cleanName = sanitizeName(name);
    const cleanPhone = phone.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      setError("Nombre inválido.");
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setError("Teléfono inválido.");
      return;
    }

    if (!time) {
      setError("Selecciona una hora.");
      return;
    }

    if (!slots.includes(time)) {
      setError("Ese horario ya no está disponible.");
      return;
    }
    // Hardening UX: si el usuario intenta forzar un slot expirado, bloquearlo localmente.
    // Regla (misma que backend): slot válido si es HOY y cumple +15 min de buffer.
    {
      const now = new Date();
      const [hh, mm] = time.split(":");
      const slotDate = new Date(now);
      slotDate.setHours(Number(hh), Number(mm), 0, 0);
      const minAllowed = new Date(now.getTime() + 15 * 60 * 1000);
      if (slotDate < minAllowed) {
        setError("Ese horario ya no está disponible.");
        return;
      }
    }

    setSaving(true);
    try {
      const data = await createAppointment(userIdSafe, {

        client_name: cleanName,
        phone: cleanPhone,
        time_slot: time,
      });

      const tn = (data as { turn_number?: number } | null | undefined)?.turn_number;
      const parsed = typeof tn === "number" ? tn : null;
      setTurn(parsed);

      if (parsed != null) {
        try {
          window.localStorage.setItem(TURN_STORAGE_KEY, String(parsed));
        } catch {
          // ignore
        }
      }

      // Refrescar slots para que el slot desaparezca (fuente de verdad: backend)
      const dataSlots = await getSlots(userIdSafe);
      setSlots(dataSlots);

      // Limpia selección
      setTime("");

      // UI premium QR: mostrar confirmación + QR antes de ir al tracking.
      if (parsed != null) {
        setQrSeedTurn(parsed);
        try {
          setTimeout(() => {
            navigate(`/track/${parsed}`);
          }, 900);
        } catch {
          navigate(`/track/${parsed}`);
        }
      }

    } catch (e) {

      setTurn(null);
      const msg = e instanceof Error ? e.message : "Error reservando";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputDisabled = loadingSlots || saving;

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        position: "relative",
        overflow: "hidden",
        paddingTop: 76,
        paddingBottom: 36,
        boxSizing: "border-box",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1100px circle at 12% 12%, rgba(59,130,246,0.30), transparent 42%), radial-gradient(900px circle at 85% 18%, rgba(168,85,247,0.22), transparent 45%), radial-gradient(850px circle at 50% 90%, rgba(34,197,94,0.12), transparent 48%), linear-gradient(180deg, rgba(7,10,20,1), rgba(10,14,32,1))",
          pointerEvents: "none",
          filter: "saturate(1.1)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -2,
          background:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 12px)",
          opacity: 0.06,
          transform: "skewY(-2deg)",
          pointerEvents: "none",
        }}
      />

      <Navbar />

      <style>{`
        .ag-bookShell{ position: relative; z-index: 1; height: 100%; display:flex; justify-content:center; }
        .ag-bookCard{
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          border-radius: 30px;
          padding: 26px 22px;
          border: 1px solid rgba(148,163,184,0.22);
          background: linear-gradient(180deg, rgba(2,6,23,0.58), rgba(2,6,23,0.28));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 30px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
          animation: agFadeUp 520ms ease both;
        }
        .ag-bookCard::before{
          content:'';
          position:absolute;
          inset:-2px;
          background: radial-gradient(800px circle at 20% 10%, rgba(59,130,246,0.30), transparent 40%), radial-gradient(650px circle at 92% 18%, rgba(168,85,247,0.25), transparent 44%);
          opacity:0.9;
          pointer-events:none;
          filter: blur(0.2px);
        }
        .ag-bookCard > *{ position: relative; z-index:1; }

        @keyframes agFadeUp{ from{opacity:0; transform: translateY(10px);} to{opacity:1; transform: translateY(0);} }
        @media (prefers-reduced-motion: reduce){ .ag-bookCard{ animation: none; } }

        .ag-bookTitle{
          margin: 10px 0 18px;
          font-size: 34px;
          font-weight: 1000;
          letter-spacing: -0.8px;
        }

        .ag-badgesRow{ display:flex; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
        .ag-badge{
          flex: 1 1 160px;
          border-radius: 18px;
          padding: 12px 14px;
          border: 1px solid rgba(148,163,184,0.20);
          background: rgba(2,6,23,0.45);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 18px 50px rgba(0,0,0,0.25);
        }
        .ag-badgeTop{ display:flex; align-items:center; justify-content:space-between; gap: 10px; }
        .ag-badgeLabel{ font-size: 12px; opacity: 0.72; font-weight: 800; letter-spacing: 0.2px; }
        .ag-badgeValue{ font-size: 22px; font-weight: 1000; letter-spacing: -0.2px; }
        .ag-badgeDot{ width: 10px; height: 10px; border-radius: 999px; box-shadow: 0 0 0 4px rgba(255,255,255,0.03), 0 0 18px rgba(59,130,246,0.35); }
        .ag-dotGreen{ background: rgba(34,197,94,1); box-shadow: 0 0 0 4px rgba(34,197,94,0.12), 0 0 18px rgba(34,197,94,0.35);} 
        .ag-dotBlue{ background: rgba(59,130,246,1); box-shadow: 0 0 0 4px rgba(59,130,246,0.12), 0 0 18px rgba(59,130,246,0.35);} 

        .ag-form{ display:flex; flex-direction:column; gap: 12px; }
        .ag-fieldLabel{ font-size: 12px; opacity: 0.74; font-weight: 900; letter-spacing: 0.2px; }

        .ag-input, .ag-select{
          height: 48px;
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,0.25);
          background: rgba(2,6,23,0.42);
          color: white;
          padding: 0 14px;
          outline: none;
          transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          font-weight: 800;
          letter-spacing: 0.1px;
        }
        .ag-input::placeholder{ color: rgba(226,232,240,0.45); font-weight: 700; }
        .ag-input:focus, .ag-select:focus{
          border-color: rgba(59,130,246,0.65);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.18), 0 0 35px rgba(59,130,246,0.12);
        }
        .ag-input:disabled{ opacity: 0.75; cursor: not-allowed; }

        .ag-select{ appearance:none; background-image: linear-gradient(45deg, transparent 50%, rgba(148,163,184,0.9) 50%), linear-gradient(135deg, rgba(148,163,184,0.9) 50%, transparent 50%);
          background-position: calc(100% - 20px) 19px, calc(100% - 14px) 19px;
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
          padding-right: 36px;
        }

        .ag-primaryBtn{
          height: 52px;
          width: 100%;
          border: 0;
          border-radius: 18px;
          cursor: pointer;
          color: #07101f;
          font-weight: 1000;
          letter-spacing: 0.2px;
          background: linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.92));
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 22px 60px rgba(59,130,246,0.20);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
        }
        .ag-primaryBtn:hover{ transform: translateY(-1px) scale(1.01); filter: saturate(1.05) brightness(1.02); box-shadow: 0 0 0 1px rgba(255,255,255,0.10), 0 28px 72px rgba(168,85,247,0.22);} 
        .ag-primaryBtn:disabled{ cursor:not-allowed; opacity:0.65; transform:none; }

        .ag-error{
          border-radius: 16px;
          padding: 12px 14px;
          border: 1px solid rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.12);
          color: #fecaca;
          font-weight: 850;
        }

        .ag-hint{ font-size: 12px; opacity: 0.68; text-align:center; margin-top: 8px; }
      `}</style>

      <div className="ag-bookShell">
        <div className="ag-bookCard" role="main" aria-label="Reservar cita">
          <div className="ag-bookTitle">Reservar cita</div>

          <div className="ag-badgesRow" aria-label="Turnos">
            <div className="ag-badge">
              <div className="ag-badgeTop">
                <div>
                  <div className="ag-badgeLabel">🟢 Turno actual</div>
                  <div className="ag-badgeValue">#{turnoActual ?? "—"}</div>
                </div>
                <div className="ag-badgeDot ag-dotGreen" aria-hidden="true" />
              </div>
            </div>

            <div className="ag-badge">
              <div className="ag-badgeTop">
                <div>
                  <div className="ag-badgeLabel">🔵 Tu turno</div>
                  <div className="ag-badgeValue">#{turn ?? "—"}</div>
                </div>
                <div className="ag-badgeDot ag-dotBlue" aria-hidden="true" />
              </div>
            </div>
          </div>

          {error && <div className="ag-error" role="alert">{error}</div>}

          <div className="ag-form">
            <div>
              <div className="ag-fieldLabel">Nombre</div>
              <input
                className="ag-input"
                placeholder="Ej: Fulano de Tal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div>
              <div className="ag-fieldLabel">Teléfono</div>
              <input
                className="ag-input"
                placeholder="Ej: +8095063750"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
            </div>

            <div>
              <div className="ag-fieldLabel">Hora</div>
              {slots.length === 0 ? (
                <div className="ag-error" role="status" style={{ marginTop: 8 }}>
                  No quedan horarios disponibles por hoy.
                </div>
              ) : (
                <select
                  className="ag-select"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={inputDisabled}
                >
                  <option value="">Selecciona hora</option>
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              className="ag-primaryBtn"
              onClick={handleSubmit}
              disabled={inputDisabled}
            >
              {saving ? "Reservando..." : "Reservar"}
            </button>
          </div>

          {turn != null && turnoActual != null && faltan != null && faltan > 0 && (
            <div className="ag-hint">Faltan {faltan} turnos para el tuyo</div>
          )}

          {qrSeedTurn != null && (
            <div
              style={{
                marginTop: 16,
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.22)",
                background:
                  "linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.18))",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.03), 0 30px 90px rgba(59,130,246,0.10)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900, letterSpacing: 0.2 }}>
                    ✅ Reserva confirmada
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 1000, marginTop: 6, letterSpacing: -0.2 }}>
                    Tu turno: #{qrSeedTurn}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ padding: 10, borderRadius: 16, border: "1px solid rgba(148,163,184,0.22)", background: "rgba(2,6,23,0.28)" }}>
                  <QRCodeCanvas value={`/track/${qrSeedTurn}`} size={148} includeMargin={false} bgColor="transparent" fgColor="#E5E7EB" level="M" />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220, flex: "1 1 220px" }}>
                  <button
                    type="button"
                    className="ag-primaryBtn"
                    style={{ background: "rgba(255,255,255,0.06)", color: "white", boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 18px 60px rgba(59,130,246,0.12)" }}
                    onClick={() => navigate(`/track/${qrSeedTurn}`)}
                  >
                    Ver seguimiento
                  </button>

                  <button
                    type="button"
                    className="ag-primaryBtn"
                    style={{ background: "linear-gradient(90deg, rgba(59,130,246,0.35), rgba(168,85,247,0.28))" }}
                    onClick={() => {
                      // Descarga: fallback elegante (si no hay canvas exportable en QRCodeCanvas)
                      try {
                        // qrcode.react renderiza un <canvas>; tomamos el primer canvas del card.
                        const canv = document.querySelector(
                          ".ag-qrcodeCard canvas"
                        ) as HTMLCanvasElement | null;

                        if (canv) {
                          const link = document.createElement("a");
                          link.href = canv.toDataURL("image/png");
                          link.download = `agender-turno-${qrSeedTurn}.png`;
                          document.body.appendChild(link);
                          link.click();
                          link.remove();
                          return;
                        }
                      } catch {
                        // ignore
                      }
                      alert("No se pudo descargar el QR en este dispositivo.");
                    }}
                  >
                    Descargar QR
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                Escanea para seguir tu turno
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

