import Navbar from "../Components/Navbar";

import { useNavigate } from "react-router-dom";
import type React from "react";


function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {

  return (
    <button
      onClick={onClick}
      className="ag-btn ag-btn-primary"
      type="button"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="ag-btn ag-btn-ghost"
      type="button"
    >
      {children}
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="ag-page">
      <div className="ag-bg" aria-hidden="true" />
      <div className="ag-ambient" aria-hidden="true" />

      <Navbar />

      <main className="ag-main">
        <section className="ag-hero" aria-label="Landing de Agender">
          <div className="ag-heroInner">
            <img
              className="ag-heroLogo"
              src="/src/assets/agender-logo.png"
              alt="AGENDER"
              
            />

            <div className="ag-copy">
              <p className="ag-subtitle">
                Sistema inteligente de gestión de turnos y citas en tiempo real.
              </p>
            </div>

            <div className="ag-ctaRow">
              <PrimaryButton onClick={() => navigate("/book")}>Reservar cita</PrimaryButton>
              <GhostButton onClick={() => navigate("/track-search")}>Rastrear turno</GhostButton>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        .ag-page{
          min-height:100vh;
          position:relative;
          overflow:hidden;
          color:white;
          font-family:var(--sans,system-ui,Segoe UI,Roboto,sans-serif);
        }

        .ag-bg{
          position:absolute;
          inset:0;
          z-index:0;
          background:
            radial-gradient(1200px circle at 15% 15%, rgba(56,189,248,0.25), transparent 45%),
            radial-gradient(1000px circle at 85% 20%, rgba(232,121,249,0.18), transparent 48%),
            radial-gradient(900px circle at 60% 90%, rgba(99,102,241,0.16), transparent 48%),
            linear-gradient(180deg, rgba(4,7,20,1) 0%, rgba(5,8,24,0.92) 55%, rgba(6,10,28,0.98) 100%);
          filter:saturate(1.05);
        }

        .ag-ambient{
          position:absolute;
          inset:-120px;
          z-index:0;
          background:
            radial-gradient(600px circle at 30% 30%, rgba(56,189,248,0.18), transparent 60%),
            radial-gradient(520px circle at 70% 20%, rgba(232,121,249,0.16), transparent 58%),
            radial-gradient(520px circle at 50% 80%, rgba(99,102,241,0.12), transparent 60%);
          filter: blur(20px);
          opacity:0.8;
          pointer-events:none;
        }

        .ag-main{
          position:relative;
          z-index:1;
          max-width:1120px;
          margin:0 auto;
          padding:12px;
          display:flex;
          align-items:flex-start;
          justify-content:flex-start;
          min-height:calc(100vh - 96px);
        }


        .ag-hero{
          width:100%;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .ag-heroInner{
          width:100%;
          max-width:860px;
          text-align:center;
          padding:22px 18px 16px;
        }


        .ag-heroLogo{
          width:340px;
          height:340px;
          object-fit:contain;
          filter:
            drop-shadow(0 0 20px rgba(56,189,248,0.38))
            drop-shadow(0 0 34px rgba(232,121,249,0.16));
          transform: translateZ(0);
          margin:0 auto;
          user-select:none;
        }



        .ag-title{
          font-weight:1000;
          letter-spacing:0.8px;
          font-size:52px;
          line-height:1;
          margin:0;
          background: linear-gradient(90deg, rgba(56,189,248,1), rgba(232,121,249,0.95));
          -webkit-background-clip:text;
          background-clip:text;
          color:transparent;
          text-shadow: 0 0 18px rgba(56,189,248,0.15);
        }

        .ag-subtitle{
          margin:8px auto 0;
          max-width:640px;
          font-size:16px;
          opacity:0.82;
          line-height:1.6;
        }


        .ag-ctaRow{
          margin:16px auto 0;
          display:flex;
          gap:10px;
          justify-content:center;
          flex-wrap:wrap;
        }


        .ag-btn{
          border-radius:16px;
          padding:14px 18px;
          min-width:210px;
          font-weight:1000;
          letter-spacing:0.2px;
          cursor:pointer;
          transition:transform 180ms ease, filter 180ms ease, background 180ms ease, border-color 180ms ease;
          user-select:none;
          outline:none;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ag-btn:active{transform:translateY(0px) scale(0.99)}

        .ag-btn-primary{
          border:0;
          background:linear-gradient(90deg, rgba(56,189,248,0.95), rgba(232,121,249,0.88));
          color:#07101f;
          box-shadow:
            0 22px 60px rgba(56,189,248,0.18),
            inset 0 0 0 1px rgba(255,255,255,0.12);
        }
        .ag-btn-primary:hover{transform:translateY(-2px);filter:saturate(1.1)}

        .ag-btn-ghost{
          background:rgba(255,255,255,0.06);
          border:1px solid rgba(148,163,184,0.25);
          color:white;
        }
        .ag-btn-ghost:hover{
          transform:translateY(-2px);
          background:rgba(255,255,255,0.09);
          border-color:rgba(148,163,184,0.42);
        }

        @media (max-width: 720px){
          .ag-heroInner{padding:22px 12px 12px;}
          .ag-main{padding:10px;}
          .ag-heroLogo{width:130px;height:130px;}
          .ag-title{font-size:42px;}
          .ag-subtitle{font-size:15px;}
          .ag-ctaRow{margin:14px auto 0;gap:10px;}
          .ag-btn{min-width:0;width:100%;max-width:360px;}
        }


        @media (prefers-reduced-motion: reduce){
          *{animation-duration:1ms !important;transition-duration:1ms !important;scroll-behavior:auto !important}
        }
      `}</style>
    </div>
  );
}


