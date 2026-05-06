"use client";
// app/clases/page.tsx
import { Nav }    from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import clasesData from "@/content/clases.json";

const {
  channelId:            CHANNEL_ID,
  channelUrl:           CHANNEL_URL,
  coursesUrl:           COURSES_URL,
  heroTitulo,
  heroDescripcion,
  videoDestacadoId,
  videoDestacadoTitulo,
  videoDestacadoMeta,
  cursosTexto,
} = clasesData as any;

const UPLOADS_PL = CHANNEL_ID.replace(/^UC/, "UU");
const RSS_PROXY  = `https://api.allorigins.win/get?url=${encodeURIComponent(
  `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
)}`;

const TOP_VIDEO = {
  id:    videoDestacadoId,
  title: videoDestacadoTitulo,
  meta:  videoDestacadoMeta,
};

interface LastVideo { id: string; title: string; published: string; }

export default function ClasesPage() {
  const [topPlaying,  setTopPlaying]  = useState(false);
  const [lastVideo,   setLastVideo]   = useState<LastVideo | null>(null);
  const [lastPlaying, setLastPlaying] = useState(false);
  const [rssLoading,  setRssLoading]  = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    fetch(RSS_PROXY, { signal: AbortSignal.timeout(8000) })
      .then(r => r.json())
      .then(json => {
        if (!json.contents) throw new Error("empty");
        const parser = new DOMParser();
        const xml    = parser.parseFromString(json.contents, "text/xml");
        const entry  = xml.querySelector("entry");
        if (!entry) throw new Error("no entries");

        let videoId = entry.querySelector("videoId")?.textContent || "";
        if (!videoId) {
          const raw = entry.querySelector("id")?.textContent || "";
          videoId = raw.split(":").pop() || "";
        }
        videoId = videoId.replace("yt:video:", "");
        if (!videoId) throw new Error("no videoId");

        const title     = entry.querySelector("title")?.textContent || "Último video";
        const published = entry.querySelector("published")?.textContent?.slice(0, 10) || "";
        setLastVideo({ id: videoId, title, published });
      })
      .catch(() => setUseFallback(true))
      .finally(() => setRssLoading(false));
  }, []);

  return (
    <>
      <Nav activeHref="/clases" />

      {/* ── Hero ── */}
      <div className="yt-hero">
        <div className="yt-hero-inner">
          <div className="yt-hero-icon">
            <svg viewBox="0 0 24 17" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.5 2.6S23.2.8 22.4.1C21.4-.9 20.3-.9 19.8-.8 16.5 0 12 0 12 0S7.5 0 4.2-.8C3.7-.9 2.6-.9 1.6.1.8.8.5 2.6.5 2.6S0 4.7 0 6.8v2c0 2.1.5 4.2.5 4.2s.3 1.8 1.1 2.5c1 1 2.4.9 3 1C6.6 16.7 12 17 12 17s4.5 0 7.8-.8c.5-.1 1.6-.2 2.6-1.1.8-.7 1.1-2.5 1.1-2.5S24 10.9 24 8.8v-2c0-2.1-.5-4.2-.5-4.2zM9.5 11.6V4.8l6.5 3.4-6.5 3.4z"/>
            </svg>
          </div>
          <div className="yt-hero-texts">
            <h1>{heroTitulo}</h1>
            <p>{heroDescripcion}</p>
            <a className="yt-hero-link" href={CHANNEL_URL} target="_blank" rel="noopener">
              ▶ Ver canal en YouTube
            </a>
          </div>
        </div>
      </div>

      <div className="page-wrap">

        {/* ── Video row ── */}
        <div className="yt-sec-header" style={{ marginBottom: ".75rem" }}>
          <div className="yt-sec-icon" style={{ background: "#fff0de" }}>📺</div>
          <div>
            <div className="yt-sec-title">Destacados del canal</div>
            <div className="yt-sec-sub">Haz clic en cualquier video para reproducirlo aquí</div>
          </div>
        </div>

        <div className="videos-row">

          {/* Video destacado */}
          <div className="yt-card">
            <div className="yt-card-label">
              <span className="yt-card-label-icon">🔥</span>
              <span className="yt-card-label-text">Video destacado</span>
            </div>
            <div className="yt-ratio">
              {topPlaying ? (
                <iframe
                  src={`https://www.youtube.com/embed/${TOP_VIDEO.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={TOP_VIDEO.title}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="yt-thumb" onClick={() => setTopPlaying(true)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${TOP_VIDEO.id}/hqdefault.jpg`}
                    alt={TOP_VIDEO.title}
                    loading="eager"
                  />
                  <div className="play-btn">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              )}
            </div>
            <div className="yt-card-info">
              <div className="yt-card-title">{TOP_VIDEO.title}</div>
              <div className="yt-card-meta">{TOP_VIDEO.meta}</div>
              <a
                className="yt-watch-btn"
                href={`https://www.youtube.com/watch?v=${TOP_VIDEO.id}`}
                target="_blank" rel="noopener"
              >
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Ver en YouTube
              </a>
            </div>
          </div>

          {/* Último publicado */}
          <div className="yt-card">
            <div className="yt-card-label">
              <span className="yt-card-label-icon">🆕</span>
              <span className="yt-card-label-text">Último publicado</span>
            </div>
            <div className="yt-ratio">
              {rssLoading && !lastVideo && !useFallback && (
                <div className="yt-sk-wrap">
                  <div className="sk" style={{ position: "absolute", inset: 0, borderRadius: 0 }} />
                </div>
              )}
              {useFallback && (
                <iframe
                  src={`https://www.youtube.com/embed?listType=playlist&list=${UPLOADS_PL}&index=1&rel=0&modestbranding=1`}
                  title="Último video SinPresupuesto"
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              )}
              {lastVideo && !lastPlaying && !useFallback && (
                <div className="yt-thumb" onClick={() => setLastPlaying(true)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${lastVideo.id}/hqdefault.jpg`}
                    alt={lastVideo.title}
                    loading="eager"
                    onError={e => { (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${lastVideo.id}/mqdefault.jpg`; }}
                  />
                  <div className="play-btn">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              )}
              {lastVideo && lastPlaying && !useFallback && (
                <iframe
                  src={`https://www.youtube.com/embed/${lastVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={lastVideo.title}
                  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            <div className="yt-card-info">
              {rssLoading && !useFallback ? (
                <>
                  <div className="sk" style={{ height: 14, width: "85%", borderRadius: 6 }} />
                  <div className="sk" style={{ height: 12, width: "55%", borderRadius: 6, marginTop: ".4rem" }} />
                </>
              ) : useFallback ? (
                <>
                  <div className="yt-card-title">Último video — SinPresupuesto UN</div>
                  <a className="yt-watch-btn" href={CHANNEL_URL} target="_blank" rel="noopener">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Ver canal
                  </a>
                </>
              ) : lastVideo ? (
                <>
                  <div className="yt-card-title">{lastVideo.title}</div>
                  <div className="yt-card-meta">🕐 {lastVideo.published} · 📺 SinPresupuesto</div>
                  <a
                    className="yt-watch-btn"
                    href={`https://www.youtube.com/watch?v=${lastVideo.id}`}
                    target="_blank" rel="noopener"
                  >
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Ver en YouTube
                  </a>
                </>
              ) : null}
            </div>
          </div>

        </div>

        {/* ── Courses banner ── */}
        <div className="yt-courses-banner">
          <div className="yt-courses-left">
            <div className="yt-courses-icon">🎓</div>
            <div className="yt-courses-texts">
              <div className="yt-courses-title">Cursos completos en YouTube</div>
              <div className="yt-courses-sub">{cursosTexto}</div>
            </div>
          </div>
          <a className="yt-courses-btn" href={COURSES_URL} target="_blank" rel="noopener">
            <svg viewBox="0 0 24 17" xmlns="http://www.w3.org/2000/svg" style={{ width: 18, height: 13, fill: "currentColor", flexShrink: 0 }}>
              <path d="M23.5 2.6S23.2.8 22.4.1C21.4-.9 20.3-.9 19.8-.8 16.5 0 12 0 12 0S7.5 0 4.2-.8C3.7-.9 2.6-.9 1.6.1.8.8.5 2.6.5 2.6S0 4.7 0 6.8v2c0 2.1.5 4.2.5 4.2s.3 1.8 1.1 2.5c1 1 2.4.9 3 1C6.6 16.7 12 17 12 17s4.5 0 7.8-.8c.5-.1 1.6-.2 2.6-1.1.8-.7 1.1-2.5 1.1-2.5S24 10.9 24 8.8v-2c0-2.1-.5-4.2-.5-4.2zM9.5 11.6V4.8l6.5 3.4-6.5 3.4z"/>
            </svg>
            Ver todos los cursos
          </a>
        </div>

      </div>

      <Footer />
    </>
  );
}
