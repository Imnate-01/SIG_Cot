import React from 'react';
import { PersonInCharge } from '@/types/foodSafetyAudit';
import { X } from 'lucide-react';

interface PersonCardFieldProps {
  label: string;
  value: PersonInCharge;
  onChange: (val: PersonInCharge) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function PersonCardField({
  label,
  value,
  onChange,
  onRemove,
  showRemove = false
}: PersonCardFieldProps) {
  return (
    <div className="relative p-4 bg-white border-l-4 border-green-600 rounded-lg shadow-sm border border-y-gray-200 border-r-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{label}</h4>
        {showRemove && onRemove && (
          <button 
            type="button" 
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Eliminar persona"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
          <input 
            type="text" 
            value={value.nombre}
            onChange={(e) => onChange({ ...value, nombre: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="Ej: Abraham Cabrera"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Puesto *</label>
          <input 
            type="text" 
            value={value.puesto}
            onChange={(e) => onChange({ ...value, puesto: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="Ej: Quality Spec."
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Empresa *</label>
          <input 
            type="text" 
            value={value.empresa}
            onChange={(e) => onChange({ ...value, empresa: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            placeholder="Ej: SIG Combibloc México"
            required
          />
        </div>
      </div>
    </div>
  );
}
