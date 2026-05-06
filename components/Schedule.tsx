"use client";
// components/Schedule.tsx
import { useEffect, useState } from "react";
import cronoDataDefault from "@/content/cronograma.json";
import { getSupabase } from "@/lib/supabase";

export function ScheduleView() {
  const [data, setData] = useState<any>(cronoDataDefault);

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data: config } = await sb.from("site_config").select("data").eq("id", "cronograma").single();
      if (config?.data) setData(config.data);
    }
    load();
  }, []);

  const { titulo, fechas, meetUrl, cols, rows } = data;

  return (
    <div className="schedule-wrap">
      <div className="schedule-topbar">
        <div className="schedule-label">📅 Horario — {titulo} · {fechas}</div>
        <a href={meetUrl || "#"} target="_blank" rel="noopener noreferrer" className="meet-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 8v8H5V8h10zm1-2H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 3v-9l-4 3V7a1 1 0 00-1-1z" fill="currentColor"/>
          </svg>
          Meet
        </a>
      </div>

      {/* ── Desktop: tabla flexible ── */}
      <div className="schedule-card sched-desktop">
        <div 
          className="sched-header" 
          style={{ gridTemplateColumns: `52px repeat(${cols.length}, 1fr)` }}
        >
          <div className="sched-header-day" />
          {cols.map((d: string) => (
            <div key={d} className="sched-header-day">{d}</div>
          ))}
        </div>
        {rows.map((row: any, ri: number) => (
          <div key={ri}>
            {ri > 0 && <div className="sched-divider" />}
            <div 
              className="sched-row"
              style={{ gridTemplateColumns: `52px repeat(${cols.length}, 1fr)` }}
            >
              <div className="sched-time">{row.label}</div>
              {row.cells.map((c: any, ci: number) => {
                const isEmpty = !c.materia && !c.logo;
                return (
                  <div 
                    key={ci} 
                    className={`sched-cell ${isEmpty ? 'is-empty' : ''}`}
                    style={{ 
                      background: c.color || 'var(--bg2)',
                      color: c.color ? '#000' : 'inherit',
                      borderLeft: ci === 0 ? 'none' : '1px solid var(--border)'
                    }}
                  >
                    {isEmpty ? (
                      <span className="sched-cell-empty-dot">·</span>
                    ) : (
                      <>
                        {c.logo && <img src={c.logo} alt="" />}
                        {c.materia && <span>{c.materia}</span>}
                        {c.subTexto && <span className="sched-cell-sub">{c.subTexto}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Móvil: tabla transpuesta ── */}
      <div className="sched-mobile">
        <table className="sched-mobile-table">
          <thead>
            <tr>
              <th>Día</th>
              {rows.map((row: any, ri: number) => (
                <th key={ri}>{row.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((day: string, di: number) => (
              <tr key={di}>
                <td>{day}</td>
                {rows.map((row: any, ri: number) => {
                  const c = row.cells[di];
                  return (
                    <td 
                      key={ri} 
                      style={{ 
                        background: c?.color || 'transparent',
                        color: c?.color ? '#000' : 'inherit'
                      }}
                    >
                      {!c?.materia && !c?.logo ? (
                        <span className="sched-mobile-empty">—</span>
                      ) : (
                        <div className="sched-mobile-cell">
                          {c.logo && <img src={c.logo} alt="" />}
                          {c.materia && <span className="cell-mat">{c.materia}</span>}
                          {c.subTexto && <span className="cell-sub">{c.subTexto}</span>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .sched-cell.is-empty {
          opacity: 0.3;
        }
        .sched-cell-empty-dot {
          font-size: 1.5rem;
          color: var(--border);
        }
      `}</style>
    </div>
  );
}
