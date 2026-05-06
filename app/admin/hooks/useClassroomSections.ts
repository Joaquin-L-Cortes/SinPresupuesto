import { useState, useEffect } from 'react';

export interface Recurso {
  type: 'drive' | 'link' | 'youtube' | string;
  title: string;
  url: string;
}

export interface Categoria {
  id: string;
  title: string;
  description: string;
  materials: Recurso[];
  topic?: string;
  topicId?: string;
  state?: string;
  creationTime?: string;
  alternateLink?: string;
}

export interface Section {
  id: string;
  name: string;
  emoji?: string; // Nuevo campo para igualar al frontend
  materials: Categoria[];
  orden?: number;
}

export function useClassroomSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSections() {
    setLoading(true);
    try {
      const res = await fetch('/api/sections');
      if (!res.ok) throw new Error('Failed to load sections');
      const data = await res.json();
      setSections(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSections();
  }, []);

  async function saveAll(updatedSections: Section[]) {
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullData: updatedSections })
      });
      if (!res.ok) throw new Error('Error al guardar cambios');
      const data = await res.json();
      setSections(data);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }

  return {
    sections,
    loading,
    error,
    refresh: fetchSections,
    saveAll
  };
}
