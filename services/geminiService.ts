
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

export const getAISuggestions = async (base64Image: string, mimeType: string): Promise<AISuggestion> => {
  // Inicializamos o cliente dentro da função para garantir que a chave de API esteja disponível no contexto de execução
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
              text: "Analise esta imagem focando em SEO Local e Marketing de Autoridade. Gere metadados otimizados para indexação no Google Imagens e Google Maps.\n\nInstruções de Conteúdo:\n1. Título: Formato 'Serviço em Cidade - Nome da Marca'.\n2. Assunto: Categoria exata do negócio.\n3. Rating: Retorne '★★★★★'.\n4. Descrição: Texto persuasivo com gatilhos de confiança e autoridade.\n5. Tags: 10 palavras-chave estratégicas separadas por vírgula.\n\nRetorne obrigatoriamente um JSON puro seguindo o esquema definido.",
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

    // Acessa a propriedade .text diretamente conforme as diretrizes do SDK
    const text = response.text;
    if (!text) throw new Error("A IA não retornou nenhum conteúdo válido.");
    
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Erro na comunicação com Gemini IA:", error);
    throw new Error("Não foi possível obter sugestões da IA no momento. Por favor, preencha manualmente.");
  }
};
