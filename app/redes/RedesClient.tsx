"use client";
import { useState } from "react";

export default function RedesClient({ redes, donaciones }: { redes: any[], donaciones: any }) {
  const [copied, setCopied] = useState(false);

  function copyNumber() {
    if (donaciones.numero) {
      navigator.clipboard?.writeText(donaciones.numero);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <>
      <style jsx>{`
        .redes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .red-card {
          background: var(--bg2);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 1.25rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all .2s;
        }
        .red-card:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px color-mix(in srgb, var(--accent) 20%, transparent);
        }
        .red-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          flex-shrink: 0;
        }
        .red-info { flex: 1; min-width: 0; }
        .red-name {
          font-weight: 700;
          font-size: 1rem;
          color: var(--fg);
          margin-bottom: .1rem;
        }
        .red-handle { font-size: .8rem; color: var(--muted); }
        
        .donate-banner {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%);
          border-radius: 24px;
          padding: 2rem;
          color: #fff;
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          margin-top: 1rem;
        }
        @media (max-width: 600px) {
          .donate-banner { flex-direction: column; padding: 1.5rem; text-align: center; align-items: center; }
        }
        .donate-icon {
          width: 56px; height: 56px;
          background: rgba(255,255,255,.2);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; flex-shrink: 0;
        }
        .donate-texts h2 {
          // font-family: 'Syne', sans-serif;
          font-size: 1.4rem; font-weight: 800; line-height: 1.2; margin-bottom: .5rem;
        }
        .donate-texts p {
          font-size: 0.9rem;
          color: rgba(255,255,255,.85);
          line-height: 1.5;
        }
        .donate-num {
          display: inline-flex; align-items: center; gap: .6rem;
          background: #fff;
          color: var(--accent);
          border: none;
          border-radius: 12px; padding: 0.6rem 1.2rem;
          font-size: 1rem; font-weight: 800;
          cursor: pointer; transition: 0.2s;
          // margin-top: 1.2rem;
          font-family: 'DM Sans', sans-serif;
        }
        .donate-num:hover { transform: scale(1.05); }
      `}</style>

      <div className="yt-hero">
        <div className="yt-hero-inner">
          <div className="yt-hero-icon" style={{ background: "var(--accent)" }}>
            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>📲</span>
          </div>
          <div className="yt-hero-texts">
            <h1>Nuestras Redes</h1>
            <p>Síguenos, únete a la comunidad y mantente al día con todo SinPresupuesto</p>
          </div>
        </div>
      </div>

      <div className="page-wrap" style={{ maxWidth: 960 }}>
        <p className="sec-label">Conecta con nosotros</p>
        <div className="redes-grid">
          {redes.map((r: any) => (
            <a key={r.nombre} href={r.url} target="_blank" rel="noopener" className="red-card">
              <div className="red-icon" style={{ background: r.bgColor || 'var(--bg3)' }}>
                {r.emoji}
              </div>
              <div className="red-info">
                <div className="red-name">{r.nombre}</div>
                <div className="red-handle">{r.handle}</div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>›</span>
            </a>
          ))}
        </div>

        <p className="sec-label">Apoya el proyecto popular</p>
        <div className="donate-banner">
          <div className="donate-icon">❤️</div>
          <div className="donate-texts">
            <h2>{donaciones.titulo}</h2>
            <p>{donaciones.subtitulo}</p>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '1rem', opacity: 0.8 }}>
              {donaciones.metodoLabel}
            </div>
            <button className="donate-num" onClick={copyNumber}>
              {copied ? "✓ Copiado al portapapeles" : donaciones.numeroDisplay || donaciones.numero}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
