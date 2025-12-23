
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

export const getAISuggestions = async (base64Image: string, mimeType: string): Promise<AISuggestion> => {
  // Cria uma nova instância a cada chamada para garantir o uso da API Key atualizada
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
              text: `Você é um consultor sênior de SEO Local especializado em Google Business Profile.
              
              REGRAS OBRIGATÓRIAS PARA O CAMPO DESCRIPTION:
              A descrição deve conter exatamente estes termos (ou variações muito próximas adaptadas ao contexto da imagem), sempre em formato hifenizado e separados por vírgula:
              'Case-de-Sucesso-Google-Meu-Negócio, Otimização-de-Perfil-GBP-Boa-Vista, Diagnóstico-Gratuito-Google-Maps, Aumento-de-Ligações-Sem-Anúncios, SEO-Local-Roraima, Correção-de-Categorias-Google, Fotos-Estratégicas-para-GBP, Perfil-que-Converte-Clientes, E3-Connect-Consultoria-RR, Vendedor-24h-Google-Maps'.

              REGRAS GERAIS:
              1. Título: 'Serviço Identificado + Em Boa Vista - E3 Connect'.
              2. Assunto: Categoria do serviço (ex: Ar Condicionado, Advocacia, etc).
              3. Rating: Sempre '★★★★★'.
              4. Tags: 10 palavras-chave estratégicas separadas por vírgula.

              Retorne o resultado estritamente em JSON.`,
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
    if (!text) throw new Error("Resposta da IA vazia.");
    
    return JSON.parse(text) as AISuggestion;
  } catch (error: any) {
    console.error("Erro Gemini Service:", error);
    throw error;
  }
};
