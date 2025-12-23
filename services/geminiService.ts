
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
              text: `Você é um especialista em SEO Local e Google Business Profile (GBP). 
              Analise esta imagem e gere metadados estratégicos.
              
              REGRAS CRÍTICAS PARA A DESCRIÇÃO:
              A descrição deve ser obrigatoriamente uma lista de frases hifenizadas separadas por vírgula, seguindo exatamente este estilo:
              'Case-de-Sucesso-Google-Meu-Negócio, Otimização-de-Perfil-GBP-Cidade, Diagnóstico-Gratuito-Google-Maps, Aumento-de-Ligações-Sem-Anúncios, SEO-Local-Estado, Correção-de-Categorias-Google, Fotos-Estratégicas-para-GBP, Perfil-que-Converte-Clientes, Nome-da-Marca-Consultoria, Vendedor-24h-Google-Maps'

              REGRAS GERAIS:
              1. Título: 'Serviço Principal + Em + Cidade/Bairro - Nome da Marca'.
              2. Assunto: Categoria exata de serviço.
              3. Rating: Sempre '★★★★★'.
              4. Tags: 10 palavras-chave curtas separadas por vírgula.
              
              Retorne APENAS o JSON estruturado.`,
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
            description: { 
              type: Type.STRING,
              description: "Lista de frases hifenizadas separadas por vírgula para SEO Local."
            },
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
