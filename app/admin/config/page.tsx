// app/admin/config/page.tsx
"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function ConfigPage() {
  return (
    <div className="admin-page-content">
      <h1 className="dash-title">Configuración del Sitio</h1>
      <p className="dash-subtitle">Gestiona el Hero y las configuraciones globales</p>
      
      <div className="stat-card" style={{marginTop: '2rem', maxWidth: '600px'}}>
        <p style={{color: 'var(--muted)', fontSize: '0.9rem'}}>Módulo de configuración en desarrollo. Aquí podrás editar el texto del Hero y los enlaces principales.</p>
      </div>
    </div>
  );
}
