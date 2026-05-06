"use client";
// components/Footer.tsx
import { useEffect, useState } from "react";

export function Footer() {
  const [data, setData] = useState<any>({
    linea1: "Sin-Presupuesto",
    linea2: "PreUniversitario gratuito",
    enlace1Texto: "",
    enlace1Url: "#",
    enlace2Texto: "",
    enlace2Url: "#"
  });
  const [redes, setRedes] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [footerRes, redesRes] = await Promise.all([
          fetch("/api/config?file=footer.json").then(res => res.json()),
          fetch("/api/config?file=redes").then(res => res.json())
        ]);

        if (footerRes && !footerRes.error) setData(footerRes);
        if (redesRes && Array.isArray(redesRes)) {
          const filtered = redesRes.filter(r => 
            r.filename !== "meet.json" && 
            r.nombre?.toLowerCase() !== "meet"
          );
          setRedes(filtered.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
        }
      } catch (e) {
        console.error("Error loading footer data:", e);
      }
    }
    load();
  }, []);

  return (
    <footer style={{
      // padding: "5rem 2rem 4rem", 
      borderTop: "1px solid var(--border)",
      // marginTop: "5rem",
      textAlign: "center"
    }}>
      <style jsx>{`
        .footer-red-icon {
          font-size: 1.4rem;
          text-decoration: none;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: inline-block;
        }
        .footer-red-icon:hover {
          transform: scale(1.25);
        }
      `}</style>

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Iconos de Redes Sociales */}
        {redes.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginBottom: "2.2rem" }}>
            {redes.map((r: any) => (
              <a
                key={r.filename || r.nombre}
                href={r.url}
                target="_blank"
                rel="noopener"
                title={r.nombre}
                className="footer-red-icon"
              >
                {r.emoji}
              </a>
            ))}
          </div>
        )}

        {/* Textos con estilo original */}
        <p style={{ fontWeight: 600, color: "var(--fg)" }}>
          {data.linea1}
        </p>

        <p style={{ marginTop: "0.35rem", fontSize: "0.72rem", opacity: 0.7, color: "var(--muted)" }}>
          {data.linea2}
        </p>

        {/* Enlaces adicionales discretos */}
        {(data.enlace1Texto || data.enlace2Texto) && (
          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center", gap: "1.2rem" }}>
            {data.enlace1Texto && (
              <a href={data.enlace1Url} style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", opacity: 0.8 }}>
                {data.enlace1Texto}
              </a>
            )}
            {data.enlace2Texto && (
              <a href={data.enlace2Url} style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", opacity: 0.8 }}>
                {data.enlace2Texto}
              </a>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
