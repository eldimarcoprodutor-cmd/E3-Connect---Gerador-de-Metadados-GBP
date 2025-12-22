
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

export const getAISuggestions = async (base64Image: string, mimeType: string): Promise<AISuggestion> => {
  try {
    // Inicializa o cliente apenas no momento do uso para garantir que process.env.API_KEY esteja disponível
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model: modelName,
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
              text: "Analise esta imagem de marketing local. Ela contém elementos de confiança, reviews do Google e autoridade. Gere metadados de altíssima conversão (SEO Local):\n\n1. Título: Nome do Serviço + Palavra-chave de Localidade + Nome da Marca (ex: Consultoria Google Maps em São Paulo - E3 Connect).\n2. Assunto: Categoria exata do serviço.\n3. Avaliação: Sempre ★★★★★.\n4. Descrição: Um parágrafo matador focando em 'prova social' e 'resultados' para indexar no Google Imagens.\n5. Tags: 10 tags estratégicas separadas por vírgula.\n\nFoque em termos como: Ranking, Google Maps, Avaliações, Autoridade Local, SEO.",
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
    if (!text) throw new Error("Resposta da IA vazia");
    
    return JSON.parse(text) as AISuggestion;
  } catch (error) {
    console.error("Erro Gemini Service:", error);
    throw new Error("Falha ao gerar sugestões. Tente preencher manualmente.");
  }
};
