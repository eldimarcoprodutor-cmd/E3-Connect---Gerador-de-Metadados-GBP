
import React, { useState, useEffect, useCallback } from 'react';
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

  // Verificação de dependências globais (EXIF e piexif)
  useEffect(() => {
    const checkDeps = () => {
      const ok = (window as any).EXIF && (window as any).piexif;
      if (!ok) {
        setState(prev => ({ ...prev, error: "Carregando módulos de processamento..." }));
      } else {
        setState(prev => ({ ...prev, error: null }));
      }
    };
    const timer = setInterval(checkDeps, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: "Por favor, envie apenas arquivos de imagem." }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const meta = await readExif(file);
        setState(prev => ({
          ...prev,
          currentImage: dataUrl,
          fileName: file.name,
          mimeType: file.type,
          metadata: meta,
          isLoading: false,
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          currentImage: dataUrl,
          fileName: file.name,
          mimeType: file.type,
          metadata: {},
          isLoading: false,
          error: "Metadados inacessíveis. Edição manual habilitada."
        }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAISuggestions = async () => {
    if (!state.currentImage || !state.mimeType) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
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
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || "Erro na IA. Tente preencher manualmente." 
      }));
    }
  };

  const processImageVisuals = async (dataUrl: string, metadata: ImageMetadata, addText: boolean): Promise<string> => {
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
          const fontSize = Math.max(24, Math.floor(canvas.width / 40));
          ctx.font = `900 ${fontSize}px Inter, sans-serif`;
          
          const text = metadata.title.toUpperCase();
          const padding = fontSize * 1.5;
          
          // Efeito de sombra para legibilidade extrema
          ctx.shadowColor = "rgba(0,0,0,1)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(text, canvas.width / 2, canvas.height - padding);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = dataUrl;
    });
  };

  const handleSave = async () => {
    if (!state.currentImage || !state.fileName) return;
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const processed = await processImageVisuals(state.currentImage, state.metadata, state.addVisualTitle);
      const withExif = writeExif(processed, state.metadata);
      
      const safeTitle = (state.metadata.title || state.fileName)
        .replace(/[\\/:*?"<>|]/g, "")
        .substring(0, 100);

      downloadImage(withExif, `${safeTitle}.jpg`);
    } catch (e) {
      setState(prev => ({ ...prev, error: "Falha ao exportar imagem otimizada." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      {state.error && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-red-600/90 backdrop-blur text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-4 border border-white/20">
            <span className="text-xl">⚠️</span>
            <span className="text-sm">{state.error}</span>
            <button 
              onClick={() => setState({...state, error: null})}
              className="ml-4 hover:scale-110 transition-transform"
            >✕</button>
          </div>
        </div>
      )}

      {!state.currentImage ? (
        <div className="max-w-4xl mx-auto mt-20 text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Google SEO Engine
            </div>
            <h2 className="text-7xl font-black tracking-tighter text-white leading-tight">
              Meta<span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500">Morph</span>
            </h2>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed font-light">
              Transforme suas fotos em <span className="text-indigo-400 font-medium">máquinas de conversão</span>. A IA analisa e injeta os metadados perfeitos para o seu negócio local.
            </p>
          </div>
          <div className="bg-slate-900/40 p-3 rounded-[2.5rem] border border-slate-800 shadow-2xl backdrop-blur-sm">
            <ImageUploader onUpload={handleFileUpload} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-slate-900/80 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl group transition-all duration-500 hover:border-indigo-500/50">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Master Preview</span>
                <button 
                  onClick={() => setState({ ...state, currentImage: null })} 
                  className="px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 transition-all uppercase"
                >
                  Substituir
                </button>
              </div>
              <div className="relative aspect-square flex items-center justify-center bg-slate-950 p-6">
                <img src={state.currentImage} className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.03]" alt="Preview" />
                {state.isLoading && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase">Otimizando Dados...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 animate-in fade-in slide-in-from-right-8 duration-700">
            <MetadataEditor 
              metadata={state.metadata}
              addVisualTitle={state.addVisualTitle}
              onToggleVisualTitle={(val) => setState(prev => ({ ...prev, addVisualTitle: val }))}
              onChange={(f, v) => setState(prev => ({ ...prev, metadata: { ...prev.metadata, [f]: v } }))}
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
