
import React, { useState, useEffect } from 'react';
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

  // Verifica se as libs externas carregaram (importante para evitar erros silenciosos na Vercel)
  useEffect(() => {
    const checkLibs = () => {
      if (typeof (window as any).EXIF === 'undefined' || typeof (window as any).piexif === 'undefined') {
        setState(prev => ({ ...prev, error: "Serviços de imagem ainda carregando... Reinicie se o erro persistir." }));
      } else {
        setState(prev => ({ ...prev, error: null }));
      }
    };
    const timer = setTimeout(checkLibs, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: "Por favor, envie apenas arquivos de imagem." }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    const reader = new FileReader();
    
    reader.onerror = () => {
      setState(prev => ({ ...prev, isLoading: false, error: "Falha ao ler o arquivo." }));
    };

    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const initialMetadata = await readExif(file);
        setState(prev => ({
          ...prev,
          currentImage: dataUrl,
          fileName: file.name,
          mimeType: file.type,
          metadata: initialMetadata,
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
          error: "Erro ao ler metadados. Você ainda pode editar manualmente."
        }));
      }
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
        error: "A IA encontrou um problema. Verifique sua conexão ou tente novamente." 
      }));
    }
  };

  const processImage = async (dataUrl: string, metadata: ImageMetadata, addText: boolean): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          ctx.drawImage(img, 0, 0);

          if (addText && metadata.title) {
            const fontSize = Math.max(24, Math.floor(canvas.width / 40));
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            
            const text = metadata.title.toUpperCase();
            const padding = fontSize * 1.5;
            
            ctx.shadowColor = "rgba(0,0,0,0.85)";
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
            
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(text, canvas.width / 2, canvas.height - padding);
          }

          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) {
          resolve(dataUrl);
        }
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
      
      let downloadName = state.metadata.title 
        ? state.metadata.title.trim() 
        : state.fileName.replace(/\.[^/.]+$/, "");
      
      // Limpeza rigorosa de caracteres especiais para evitar erro no download
      downloadName = downloadName
        .replace(/[\\/:*?"<>|]/g, "")
        .substring(0, 150); // Limita tamanho do nome

      downloadImage(finalImageWithExif, `${downloadName}.jpg`);
    } catch (e) {
      console.error(e);
      setState(prev => ({ ...prev, error: "Erro ao salvar imagem. Tente reduzir o título." }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <Layout>
      {state.error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm flex justify-between items-center animate-pulse">
          <span>{state.error}</span>
          <button onClick={() => setState({...state, error: null})} className="font-bold">✕</button>
        </div>
      )}

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
                <p>Arquivo: {state.fileName}</p>
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
