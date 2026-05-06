"use client";
// app/comunidad/ComunidadShell.tsx
import dynamic from "next/dynamic";

const ForumClient = dynamic(() => import("./ForumClient"), { ssr: false });
export function ComunidadShell() { return <ForumClient />; }
