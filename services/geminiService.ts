
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

export const getAISuggestions = async (base64Image: string, mimeType: string): Promise<AISuggestion> => {
  // Inicialização obrigatória usando a chave injetada no ambiente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: mimeType,
              },
            },
            {
              text: `Você é um especialista em SEO Local e Google Business Profile para a agência E3 Connect em Boa Vista, Roraima.
              
              REGRAS OBRIGATÓRIAS PARA O CAMPO DESCRIPTION:
              Você DEVE gerar uma descrição que contenha EXATAMENTE esta lista de frases hifenizadas separadas por vírgula:
              'Case-de-Sucesso-Google-Meu-Negócio, Otimização-de-Perfil-GBP-Boa-Vista, Diagnóstico-Gratuito-Google-Maps, Aumento-de-Ligações-Sem-Anúncios, SEO-Local-Roraima, Correção-de-Categorias-Google, Fotos-Estratégicas-para-GBP, Perfil-que-Converte-Clientes, E3-Connect-Consultoria-RR, Vendedor-24h-Google-Maps'

              REGRAS ADICIONAIS:
              1. Título: Gere um título SEO (Serviço + em Boa Vista - E3 Connect).
              2. Assunto: Categoria do serviço identificado na foto.
              3. Rating: Sempre '★★★★★'.
              4. Tags: 10 palavras-chave curtas relacionadas ao negócio.
              
              Retorne o resultado estritamente no formato JSON definido.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subject: { type: Type.STRING },
            description: { type: Type.STRING },
            rating: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "subject", "description", "rating", "tags"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou conteúdo. Verifique sua conexão ou chave de API.");
    
    return JSON.parse(text) as AISuggestion;
  } catch (error: any) {
    console.error("Erro no Gemini Service:", error);
    throw error;
  }
};
