import { useState } from 'react';
import { Section, useClassroomSections } from '@/app/admin/hooks/useClassroomSections';
import ModalForm from './ModalForm';
import ConfirmDialog from './ConfirmDialog';

export default function SectionList() {
  const { sections, loading, error, refresh, saveAll } = useClassroomSections();
  const [editing, setEditing] = useState<Section | null>(null);
  const [showDelete, setShowDelete] = useState<{ id: string; targetSectionId?: string } | null>(null);

  if (loading) return <p>Cargando secciones...</p>;
  if (error) return <p>Error: {error}</p>;

  const sorted = [...sections].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const moveUp = async (sec: Section) => {
    const idx = sorted.findIndex(s => s.id === sec.id);
    if (idx <= 0) return;
    const updated = [...sections];
    const a = updated.find(s => s.id === sorted[idx].id)!;
    const b = updated.find(s => s.id === sorted[idx - 1].id)!;
    const tmp = a.orden ?? idx;
    a.orden = b.orden ?? idx - 1;
    b.orden = tmp;
    await saveAll(updated);
    refresh();
  };

  const moveDown = async (sec: Section) => {
    const idx = sorted.findIndex(s => s.id === sec.id);
    if (idx >= sorted.length - 1) return;
    const updated = [...sections];
    const a = updated.find(s => s.id === sorted[idx].id)!;
    const b = updated.find(s => s.id === sorted[idx + 1].id)!;
    const tmp = a.orden ?? idx;
    a.orden = b.orden ?? idx + 1;
    b.orden = tmp;
    await saveAll(updated);
    refresh();
  };

  const handleCreate = async (nombre: string) => {
    const newSection: Section = {
      id: String(Date.now()),
      name: nombre,
      materials: [],
      orden: sections.length,
    };
    await saveAll([...sections, newSection]);
    refresh();
  };

  const handleUpdate = async (id: string, nombre: string) => {
    const updated = sections.map(s => s.id === id ? { ...s, name: nombre } : s);
    await saveAll(updated);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const updated = sections.filter(s => s.id !== id);
    await saveAll(updated);
    setShowDelete(null);
    refresh();
  };

  return (
    <div className="admin-card">
      <h3 className="admin-page-title">Secciones</h3>
      <button
        className="btn-primary"
        onClick={() => setEditing({ id: '', name: '', materials: [], orden: sections.length })}
      >
        ➕ Añadir Sección
      </button>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Orden</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((sec, idx) => (
            <tr key={sec.id}>
              <td>{sec.name}</td>
              <td>{idx + 1}</td>
              <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn-secondary" onClick={() => setEditing(sec)} title="Editar">✏️</button>
                <button className="btn-secondary" onClick={() => moveUp(sec)} disabled={idx === 0} title="Subir">⬆️</button>
                <button className="btn-secondary" onClick={() => moveDown(sec)} disabled={idx === sorted.length - 1} title="Bajar">⬇️</button>
                <button className="btn-danger" onClick={() => setShowDelete({ id: sec.id })} title="Eliminar">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <ModalForm
          initialData={editing}
          onClose={() => setEditing(null)}
          onSubmit={async data => {
            if (data.id) {
              await handleUpdate(data.id, data.name);
            } else {
              await handleCreate(data.name);
            }
            setEditing(null);
          }}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          message="¿Está seguro de eliminar esta sección? Se eliminarán todos sus materiales."
          onCancel={() => setShowDelete(null)}
          onConfirm={() => handleDelete(showDelete.id)}
        />
      )}
    </div>
  );
}
