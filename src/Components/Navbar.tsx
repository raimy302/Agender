import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken, getToken, logout } from "../Services/api";

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="ag-navLink" onClick={onClick}>
      {label}
    </button>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const token = useMemo(() => getToken(), []);

  const hasToken = !!token;

  const handleHome = () => navigate("/");
  const handleBook = () => navigate("/book");
  const handleTrack = () => navigate("/track-search");
  const handleDashboard = () => navigate("/dashboard");
  const handleLogin = () => navigate("/login");

  const handleLogout = async () => {
    try {
      if (typeof logout === "function") await logout();
    } catch {
      // ignore
    } finally {
      try {
        clearToken();
      } catch {
        // ignore
      }
      navigate("/");
    }
  };

  return (
    <div className="ag-globalNavWrap">
      <style>{`
        .ag-globalNavWrap{
          position:sticky;
          top:0;
          z-index:50;
          display:flex;
          justify-content:center;
          pointer-events:none;
        }
        .ag-globalNav{
          pointer-events:auto;
          width:100%;
          max-width:1120px;
          margin:0 auto;
          padding:9px 14px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          border:1px solid rgba(148,163,184,0.18);
          background:rgba(2,6,23,0.52);
          backdrop-filter:blur(14px);
          -webkit-backdrop-filter:blur(14px);
          border-radius:14px;
          box-shadow:0 14px 40px rgba(0,0,0,0.22);
          margin-top:10px;
        }
        .ag-brandBtn{
          display:flex;
          align-items:center;
          gap:10px;
          background:transparent;
          border:0;
          color:white;
          cursor:pointer;
          padding:6px 8px;
          border-radius:12px;
          transition:background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
          box-shadow:0 0 0 rgba(0,0,0,0);
        }
        .ag-brandBtn:hover{background:rgba(255,255,255,0.06); transform:translateY(-1px); box-shadow:0 0 0 1px rgba(59,130,246,0.18), 0 0 24px rgba(59,130,246,0.16)}
        .ag-brandMark{
          width:38px;
          height:38px;
          border-radius:16px;
          box-shadow:0 0 0 1px rgba(255,255,255,0.08), 0 0 38px rgba(59,130,246,0.30);
          background:transparent;
          overflow:hidden;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ag-brandMark img{
          width:100%;
          height:100%;
          object-fit:contain;
          filter: drop-shadow(0 0 12px rgba(59,130,246,0.35));
        }
        .ag-brandText{display:flex; flex-direction:column; line-height:1.05}
        .ag-brandTitle{font-weight:1000; letter-spacing:0.8px; font-size:13px}
        .ag-brandSub{font-size:12px; opacity:0.65; margin-top:3px}

        .ag-navLinks{display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end}
        .ag-navLinks{display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end}
        .ag-navLink{
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(148,163,184,0.22);
          color:white;
          padding:7px 10px;
          border-radius:12px;
          cursor:pointer;
          font-weight:1000;
          letter-spacing:0.2px;
          transition:transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }
        .ag-navLink:hover{
          transform:translateY(-1px);
          background:rgba(255,255,255,0.09);
          border-color:rgba(148,163,184,0.40);
          box-shadow:0 0 0 1px rgba(59,130,246,0.10), 0 0 26px rgba(59,130,246,0.12);
        }
        .ag-authBtn{background:linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.88)); color:#07101f; border:0}

        @media (max-width: 720px){
          .ag-globalNav{padding:8px 10px; margin-top:8px}
          .ag-navLinks{gap:8px}
          .ag-brandSub{display:none}
        }
      `}</style>

      <div className="ag-globalNav" role="navigation" aria-label="Navegación global">
        <button type="button" className="ag-brandBtn" onClick={handleHome} aria-label="Ir a Agender Home">
          <div className="ag-brandMark" aria-hidden="true">
            <img src="/src/assets/agender-icon.png" alt="" />
          </div>

          <div className="ag-brandText">
            <div className="ag-brandTitle">AGENDER</div>
            <div className="ag-brandSub">Turnos en tiempo real</div>
          </div>
        </button>

        <div className="ag-navLinks">
          <NavButton label="Reservar" onClick={handleBook} />
          <NavButton label="Rastrear" onClick={handleTrack} />
          <NavButton label="Dashboard" onClick={handleDashboard} />

          {hasToken ? (
            <button type="button" className="ag-navLink ag-authBtn" onClick={handleLogout}>
              Cerrar sesión
            </button>
          ) : (
            <button type="button" className="ag-navLink ag-authBtn" onClick={handleLogin}>
              Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

