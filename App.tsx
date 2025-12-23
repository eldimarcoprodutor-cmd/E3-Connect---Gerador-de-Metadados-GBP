
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
  const [hasKey, setHasKey] = useState<boolean>(true);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
      return selected;
    }
    return true;
  };

  useEffect(() => {
    checkApiKey();
    const timer = setInterval(() => {
      const ok = (window as any).EXIF && (window as any).piexif;
      if (!ok) {
        setState(prev => ({ ...prev, error: "Carregando módulos de imagem..." }));
      } else {
        setState(prev => ({ ...prev, error: null }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: "Envie apenas imagens." }));
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
        setState(prev => ({ ...prev, currentImage: dataUrl, fileName: file.name, mimeType: file.type, metadata: {}, isLoading: false }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAISuggestions = async () => {
    if (!state.currentImage || !state.mimeType) return;
    
    const keyOk = await checkApiKey();
    if (!keyOk) {
      await handleSelectKey();
      return;
    }

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
      console.error("Erro ao sugerir com IA:", err);
      const msg = err.message || "";
      if (msg.includes("API key") || msg.includes("not found") || msg.includes("403") || msg.includes("401")) {
        setHasKey(false);
        await handleSelectKey();
      }
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Erro de Conexão com IA. Verifique sua chave de API." 
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
          const fontSize = Math.max(24, Math.floor(canvas.width / 35));
          ctx.font = `900 ${fontSize}px Inter, sans-serif`;
          ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.shadowBlur = 12;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(metadata.title.toUpperCase(), canvas.width / 2, canvas.height - (fontSize * 1.5));
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
      const safeTitle = (state.metadata.title || "imagem-seo").replace(/[\\/:*?"<>|]/g, "").substring(0, 80);
      downloadImage(withExif, `${safeTitle}.jpg`);
    } catch (e) {
      setState(prev => ({ ...prev, error: "Erro ao salvar imagem." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      {state.error && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-3">
            <span>⚠️</span>
            <span className="text-sm">{state.error}</span>
            <button onClick={() => setState({...state, error: null})} className="ml-2 font-black">✕</button>
          </div>
        </div>
      )}

      {!state.currentImage ? (
        <div className="max-w-4xl mx-auto mt-20 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-6xl font-black tracking-tighter text-white">
              Meta<span className="text-indigo-500">Morph</span>
            </h2>
            <p className="text-slate-400 text-lg">
              Otimize suas imagens para Google Maps e SEO Local em segundos.
            </p>
          </div>
          <ImageUploader onUpload={handleFileUpload} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <div className="p-4 bg-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-indigo-400">Preview</span>
                <button onClick={() => setState({...state, currentImage: null})} className="text-[10px] font-bold text-slate-400 underline">Trocar</button>
              </div>
              <div className="p-4 bg-black aspect-square flex items-center justify-center">
                <img src={state.currentImage} className="max-w-full max-h-full rounded-lg shadow-lg" alt="Preview" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <MetadataEditor 
              metadata={state.metadata}
              addVisualTitle={state.addVisualTitle}
              hasApiKey={hasKey}
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
