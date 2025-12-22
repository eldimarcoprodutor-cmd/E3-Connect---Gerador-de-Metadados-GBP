
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

  useEffect(() => {
    const checkDependencies = () => {
      const isMissing = typeof (window as any).EXIF === 'undefined' || typeof (window as any).piexif === 'undefined';
      if (isMissing) {
        setState(prev => ({ ...prev, error: "Aguardando carregamento de módulos de imagem..." }));
      } else {
        setState(prev => ({ ...prev, error: null }));
      }
    };
    const interval = setInterval(checkDependencies, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: "Tipo de arquivo inválido. Use JPG ou PNG." }));
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
          error: "Metadados originais inacessíveis. Edição manual liberada."
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
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "IA temporariamente indisponível. Preencha os campos abaixo." 
      }));
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
          const fontSize = Math.max(30, Math.floor(canvas.width / 35));
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          
          const padding = fontSize * 1.2;
          const text = metadata.title.toUpperCase();
          
          // Background shadow for legibility
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText(text, canvas.width / 2, canvas.height - padding);
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
      const processed = await processImage(state.currentImage, state.metadata, state.addVisualTitle);
      const withExif = writeExif(processed, state.metadata);
      
      const cleanName = (state.metadata.title || state.fileName)
        .replace(/[\\/:*?"<>|]/g, "")
        .substring(0, 80);

      downloadImage(withExif, cleanName);
    } catch (e) {
      setState(prev => ({ ...prev, error: "Falha ao exportar. Tente um título mais curto." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      {state.error && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-3">
            <span>⚠️ {state.error}</span>
            <button onClick={() => setState({...state, error: null})}>✕</button>
          </div>
        </div>
      )}

      {!state.currentImage ? (
        <div className="max-w-3xl mx-auto mt-16 text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="space-y-4">
            <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
              SEO Local & Autoridade Visual
            </div>
            <h2 className="text-6xl font-black tracking-tighter text-white">
              Meta<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Morph</span>
            </h2>
            <p className="text-slate-400 text-xl max-w-xl mx-auto leading-relaxed">
              Injete metadados de alta conversão em suas fotos e domine o Google Imagens.
            </p>
          </div>
          <div className="bg-slate-900/50 p-2 rounded-3xl border border-slate-800 shadow-inner">
            <ImageUploader onUpload={handleFileUpload} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl group">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Master File Preview</span>
                <button 
                  onClick={() => setState({ ...state, currentImage: null })} 
                  className="text-[10px] font-bold text-slate-500 hover:text-white uppercase transition-colors"
                >
                  Trocar Imagem
                </button>
              </div>
              <div className="relative aspect-square md:aspect-video flex items-center justify-center bg-black/40 p-4">
                <img src={state.currentImage} className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" alt="MetaMorph Preview" />
                {state.isLoading && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
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
