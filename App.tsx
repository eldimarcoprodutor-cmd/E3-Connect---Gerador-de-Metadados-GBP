
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ImageUploader } from './components/ImageUploader';
import { MetadataEditor } from './components/MetadataEditor';
import { AppState, ImageMetadata } from './types';
import { readExif, writeExif, downloadImage } from './services/exifService';
import { getAISuggestions } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentImage: null,
    fileName: null,
    mimeType: null,
    metadata: {},
    isLoading: false,
    error: null,
    addVisualTitle: false,
  });

  const handleFileUpload = async (file: File) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const initialMetadata = await readExif(file);
      setState(prev => ({
        ...prev,
        currentImage: dataUrl,
        fileName: file.name,
        mimeType: file.type,
        metadata: initialMetadata,
        isLoading: false,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleMetadataChange = (field: keyof ImageMetadata, value: string) => {
    setState(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value }
    }));
  };

  const handleAISuggestions = async () => {
    if (!state.currentImage || !state.mimeType) return;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const suggestions = await getAISuggestions(state.currentImage, state.mimeType);
      setState(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          title: suggestions.title,
          subject: suggestions.subject,
          description: suggestions.description,
          rating: suggestions.rating,
          userComment: suggestions.tags.join(", ")
        },
        isLoading: false
      }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const processImage = async (dataUrl: string, metadata: ImageMetadata, addText: boolean): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);

        if (addText && metadata.title) {
          // Ajuste dinâmico de fonte baseado na resolução
          const fontSize = Math.max(32, Math.floor(canvas.width / 35));
          ctx.font = `900 ${fontSize}px Inter, system-ui, sans-serif`;
          
          const text = metadata.title.toUpperCase();
          const padding = fontSize * 0.8;
          
          // Efeito de sombra projetada para legibilidade sem barra sólida
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          
          // Posicionamento no rodapé com margem segura
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(text, canvas.width / 2, canvas.height - padding);
          
          // Reset shadow para não afetar outros processos
          ctx.shadowBlur = 0;
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = dataUrl;
    });
  };

  const handleSave = async () => {
    if (!state.currentImage || !state.fileName) return;
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const processedBase64 = await processImage(state.currentImage, state.metadata, state.addVisualTitle);
      const finalImageWithExif = writeExif(processedBase64, state.metadata);
      
      // Nome do arquivo é o título preenchido
      let downloadName = state.metadata.title ? state.metadata.title.trim() : state.fileName.replace(/\.[^/.]+$/, "");
      
      // Limpeza básica apenas para evitar erros de sistema de arquivos, mantendo espaços
      downloadName = downloadName.replace(/[\\/:*?"<>|]/g, "") + ".jpg";

      downloadImage(finalImageWithExif, downloadName);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar imagem.");
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      {!state.currentImage ? (
        <div className="max-w-2xl mx-auto mt-12 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight text-white uppercase italic">
              Meta<span className="text-indigo-500">Morph</span>
            </h2>
            <p className="text-slate-400 text-lg">Otimização Cirúrgica de Metadados para SEO Local.</p>
          </div>
          <ImageUploader onUpload={handleFileUpload} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl sticky top-24">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Preview de Arquivo</span>
                <button onClick={() => setState({ ...state, currentImage: null })} className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase transition-colors">Nova Imagem</button>
              </div>
              <div className="aspect-video flex items-center justify-center p-2 bg-black/20">
                <img src={state.currentImage} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl" alt="Original" />
              </div>
              <div className="p-4 bg-slate-950/50 text-[10px] text-slate-500">
                <p>Nome Original: {state.fileName}</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <MetadataEditor 
              metadata={state.metadata}
              addVisualTitle={state.addVisualTitle}
              onToggleVisualTitle={(val) => setState(prev => ({ ...prev, addVisualTitle: val }))}
              onChange={handleMetadataChange}
              onAISuggest={handleAISuggestions}
              onSave={handleSave}
              isProcessing={state.isLoading}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
