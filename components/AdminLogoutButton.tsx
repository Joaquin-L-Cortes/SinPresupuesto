// components/AdminLogoutButton.tsx
"use client";
import { useAuth } from "@/lib/auth-context";

export function AdminLogoutButton() {
  const { logout } = useAuth();

  return (
    <button 
      onClick={logout}
      style={{
        background: 'rgba(231, 76, 60, 0.2)',
        color: '#e74c3c',
        border: '1.5px solid rgba(231, 76, 60, 0.4)',
        padding: '0.4rem 1rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(231, 76, 60, 0.3)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)'}
    >
      Cerrar Sesión
    </button>
  );
}
