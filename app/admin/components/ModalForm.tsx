import { useState, useEffect } from "react";

export interface SectionFormData {
  id?: string;
  name: string;
  orden?: number;
}

type Props = {
  initialData?: SectionFormData;
  onClose: () => void;
  onSubmit: (data: SectionFormData) => Promise<void>;
};

export default function ModalForm({ initialData, onClose, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [orden, setOrden] = useState(initialData?.orden ?? 0);

  useEffect(() => {
    if (initialData?.name) setName(initialData.name);
    if (initialData?.orden !== undefined) setOrden(initialData.orden);
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ id: initialData?.id, name, orden });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>{initialData?.id ? "Editar Sección" : "Crear Sección"}</h3>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <label>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          {initialData?.id && (
            <div className="form-row">
              <label>Orden</label>
              <input
                type="number"
                min={0}
                value={orden}
                onChange={e => setOrden(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {initialData?.id ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
