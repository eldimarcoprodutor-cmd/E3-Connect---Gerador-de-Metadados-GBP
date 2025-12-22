
import React, { useState } from 'react';
import { ImageMetadata } from '../types';

interface MetadataEditorProps {
  metadata: ImageMetadata;
  addVisualTitle: boolean;
  onToggleVisualTitle: (val: boolean) => void;
  onChange: (field: keyof ImageMetadata, value: string) => void;
  onAISuggest: () => void;
  onSave: () => void;
  isProcessing: boolean;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ 
  metadata, 
  addVisualTitle,
  onToggleVisualTitle,
  onChange, 
  onAISuggest, 
  onSave, 
  isProcessing 
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleManualSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      try {
        onSave();
      } finally {
        setIsSaving(false);
      }
    }, 300);
  };

  const fields: { label: string; key: keyof ImageMetadata; placeholder: string; isTextarea?: boolean }[] = [
    { label: "Título da Imagem (SEO principal)", key: "title", placeholder: "Ex: Ar condicionado em Boa Vista - Nome da Empresa" },
    { label: "Assunto / Categoria", key: "subject", placeholder: "Ex: Manutenção de Ar Condicionado" },
    { label: "Avaliação", key: "rating", placeholder: "★★★★★" },
    { label: "Palavras-chave (Tags)", key: "userComment", placeholder: "manutencao, instalacao, limpeza-ar, boa-vista-rr", isTextarea: true },
    { label: "Descrição / Comentários", key: "description", placeholder: "Texto longo para indexação no Google...", isTextarea: true },
    { label: "Autor (Empresa)", key: "artist", placeholder: "Nome da sua marca" },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block"></span>
            Editor Manual
          </h2>
          <p className="text-xs text-slate-400 mt-1">Preencha e clique em fixar para gravar no arquivo.</p>
        </div>
        <button 
          onClick={onAISuggest}
          disabled={isProcessing || isSaving}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30"
        >
          {isProcessing ? "Gerando..." : "Sugerir com IA"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.isTextarea ? "md:col-span-2" : ""}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">{f.label}</label>
            {f.isTextarea ? (
              <textarea
                value={metadata[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none transition-all resize-none"
              />
            ) : (
              <input
                type="text"
                value={metadata[f.key] || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 outline-none transition-all"
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={addVisualTitle}
              onChange={(e) => onToggleVisualTitle(e.target.checked)}
            />
            <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
            <div className="absolute left-1 top-1 w-3 h-3 bg-slate-400 rounded-full peer-checked:left-6 peer-checked:bg-white transition-all"></div>
          </div>
          <span className="text-xs font-bold text-slate-300 group-hover:text-white">Adicionar nome (título) visualmente na imagem</span>
        </label>
        <p className="text-[10px] text-slate-500 italic ml-13">Isso irá "escrever" o título no canto inferior da imagem antes de salvar.</p>
      </div>

      <button
        onClick={handleManualSave}
        disabled={isSaving || isProcessing}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {isSaving ? "FIXANDO DADOS..." : "FIXAR METADADOS E BAIXAR IMAGEM"}
      </button>
    </div>
  );
};
