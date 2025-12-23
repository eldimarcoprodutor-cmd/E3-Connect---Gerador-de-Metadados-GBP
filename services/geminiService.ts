
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
              text: "Você é um especialista em SEO Local e Google Business Profile. Analise esta imagem e gere metadados para maximizar o ranqueamento local.\n\nRegras:\n1. Título: 'Serviço Principal + Em + Cidade/Bairro - Nome da Marca'.\n2. Assunto: Categoria exata de serviço (ex: Manutenção Predial).\n3. Rating: Sempre '★★★★★'.\n4. Descrição: Texto rico em palavras-chave com prova social e CTA.\n5. Tags: 10 tags separadas por vírgula, sem espaços entre elas.\n\nRetorne APENAS o JSON estruturado.",
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
    if (!text) throw new Error("A IA retornou uma resposta vazia.");
    
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Erro Crítico Gemini:", error);
    throw new Error("Falha na IA. Verifique sua chave de API ou conexão.");
  }
};
