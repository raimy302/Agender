import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar";

export default function TrackSearch() {
  const navigate = useNavigate();

  const [turnInput, setTurnInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const turnParsed = useMemo(() => {
    const n = Number(turnInput);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }, [turnInput]);

  const handleSubmit = async () => {
    setError(null);
    if (turnParsed == null) {
      setError("Ingresa un numero de turno valido.");
      return;
    }

    setSubmitting(true);
    try {
      navigate(`/track/${turnParsed}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ag-trackSearchPage">
      <div className="ag-trackSearchBg" aria-hidden="true" />
      <div className="ag-trackSearchGrid" aria-hidden="true" />

      <Navbar />

      <main className="ag-trackSearchMain">
        <section className="ag-trackSearchCard" aria-label="Rastrear turno">
          <div className="ag-trackSearchHead">
            <div className="ag-trackSearchTitleGroup">
              <div className="ag-trackSearchIcon" aria-hidden="true">
                <img src="/src/assets/agender-icon.png" alt="" />
              </div>

              <div>
                <div className="ag-trackSearchKicker">Rastrear turno</div>
                <h1>Encuentra tu estado</h1>
              </div>
            </div>

            <div className="ag-trackSearchBadge">
              <div>Acceso</div>
              <strong>Publico</strong>
            </div>
          </div>

          <div className="ag-trackSearchForm">
            <label htmlFor="turn">Numero de turno</label>
            <input
              id="turn"
              inputMode="numeric"
              value={turnInput}
              onChange={(e) => setTurnInput(e.target.value)}
              placeholder="Ej: 25"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />

            {error && (
              <div className="ag-trackSearchError" role="alert">
                {error}
              </div>
            )}

            <button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Buscando..." : "Rastrear"}
            </button>

            <p>Si el sistema esta ocupado, reintenta mas tarde.</p>
          </div>
        </section>
      </main>

      <style>{`
        .ag-trackSearchPage{
          min-height:100vh;
          position:relative;
          overflow:hidden;
          color:white;
          padding-top:76px;
          padding-bottom:36px;
          box-sizing:border-box;
        }

        .ag-trackSearchBg{
          position:absolute;
          inset:0;
          z-index:0;
          background:
            radial-gradient(1200px circle at 10% 10%, rgba(59,130,246,0.26), transparent 42%),
            radial-gradient(900px circle at 88% 18%, rgba(168,85,247,0.20), transparent 45%),
            radial-gradient(800px circle at 50% 92%, rgba(34,197,94,0.12), transparent 48%),
            linear-gradient(180deg, rgba(7,10,20,1), rgba(10,14,32,1));
          pointer-events:none;
        }

        .ag-trackSearchGrid{
          position:absolute;
          inset:-2px;
          z-index:0;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 12px);
          opacity:0.06;
          transform:skewY(-2deg);
          pointer-events:none;
        }

        .ag-trackSearchMain{
          position:relative;
          z-index:1;
          display:grid;
          place-items:start center;
          padding:18px;
        }

        .ag-trackSearchCard{
          width:100%;
          max-width:560px;
          border-radius:30px;
          padding:22px;
          border:1px solid rgba(148,163,184,0.22);
          background:linear-gradient(180deg, rgba(2,6,23,0.58), rgba(2,6,23,0.28));
          box-shadow:0 30px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
          position:relative;
          overflow:hidden;
          animation:agenderFadeUp 520ms ease both;
        }

        .ag-trackSearchCard::before{
          content:'';
          position:absolute;
          inset:-2px;
          background:
            radial-gradient(800px circle at 20% 10%, rgba(59,130,246,0.30), transparent 40%),
            radial-gradient(650px circle at 92% 18%, rgba(168,85,247,0.25), transparent 44%);
          opacity:0.9;
          pointer-events:none;
        }

        .ag-trackSearchCard > *{
          position:relative;
          z-index:1;
        }

        .ag-trackSearchHead{
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        }

        .ag-trackSearchTitleGroup{
          display:flex;
          align-items:center;
          gap:12px;
        }

        .ag-trackSearchIcon{
          width:48px;
          height:48px;
          border-radius:18px;
          border:1px solid rgba(255,255,255,0.08);
          background:rgba(255,255,255,0.04);
          box-shadow:0 0 0 1px rgba(255,255,255,0.04), 0 0 38px rgba(59,130,246,0.28);
          display:flex;
          align-items:center;
          justify-content:center;
          flex:0 0 auto;
        }

        .ag-trackSearchIcon img{
          width:34px;
          height:34px;
          object-fit:contain;
          filter:drop-shadow(0 0 12px rgba(59,130,246,0.35));
        }

        .ag-trackSearchKicker{
          font-size:12px;
          opacity:0.72;
          font-weight:900;
          letter-spacing:0.2px;
        }

        .ag-trackSearchHead h1{
          margin:6px 0 0;
          font-size:30px;
          line-height:1.05;
          letter-spacing:0;
        }

        .ag-trackSearchBadge{
          padding:10px 12px;
          border-radius:16px;
          border:1px solid rgba(59,130,246,0.25);
          background:rgba(59,130,246,0.10);
          box-shadow:0 0 30px rgba(59,130,246,0.20);
          align-self:flex-start;
        }

        .ag-trackSearchBadge div{
          font-size:12px;
          opacity:0.7;
        }

        .ag-trackSearchBadge strong{
          display:block;
          margin-top:2px;
          font-weight:900;
        }

        .ag-trackSearchForm{
          margin-top:18px;
          display:grid;
          gap:10px;
        }

        .ag-trackSearchForm label{
          font-size:12px;
          opacity:0.74;
          font-weight:900;
          letter-spacing:0.2px;
        }

        .ag-trackSearchForm input{
          height:48px;
          border-radius:16px;
          border:1px solid rgba(148,163,184,0.25);
          background:rgba(2,6,23,0.42);
          color:white;
          padding:0 14px;
          outline:none;
          font-weight:800;
          letter-spacing:0.1px;
          transition:border-color 180ms ease, box-shadow 180ms ease;
        }

        .ag-trackSearchForm input::placeholder{
          color:rgba(226,232,240,0.45);
          font-weight:700;
        }

        .ag-trackSearchForm input:focus{
          border-color:rgba(59,130,246,0.65);
          box-shadow:0 0 0 4px rgba(59,130,246,0.18), 0 0 35px rgba(59,130,246,0.12);
        }

        .ag-trackSearchError{
          margin-top:4px;
          border-radius:16px;
          padding:12px 14px;
          border:1px solid rgba(239,68,68,0.35);
          background:rgba(239,68,68,0.12);
          color:#fecaca;
          font-weight:850;
        }

        .ag-trackSearchForm button{
          margin-top:4px;
          height:52px;
          width:100%;
          border:0;
          border-radius:18px;
          cursor:pointer;
          color:#07101f;
          font-weight:1000;
          letter-spacing:0.2px;
          background:linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.92));
          box-shadow:0 0 0 1px rgba(255,255,255,0.08), 0 22px 60px rgba(59,130,246,0.20);
          transition:transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }

        .ag-trackSearchForm button:hover:not(:disabled){
          transform:translateY(-1px) scale(1.01);
          filter:saturate(1.05) brightness(1.02);
          box-shadow:0 0 0 1px rgba(255,255,255,0.10), 0 28px 72px rgba(168,85,247,0.22);
        }

        .ag-trackSearchForm button:disabled{
          cursor:not-allowed;
          opacity:0.65;
          transform:none;
        }

        .ag-trackSearchForm p{
          margin:8px 0 0;
          font-size:12px;
          opacity:0.65;
          text-align:center;
        }

        @keyframes agenderFadeUp{
          from{opacity:0; transform:translateY(10px);}
          to{opacity:1; transform:translateY(0);}
        }

        @media (max-width: 540px){
          .ag-trackSearchCard{padding:20px 18px; border-radius:26px;}
          .ag-trackSearchHead h1{font-size:26px;}
          .ag-trackSearchBadge{width:100%; box-sizing:border-box;}
        }

        @media (prefers-reduced-motion: reduce){
          *{animation-duration:1ms !important; transition-duration:1ms !important;}
        }
      `}</style>
    </div>
  );
}
