
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateRecipeSuggestion(lastMatches: string[]) {
  const prompt = `Basierend auf diesen letzten Gerichten: ${lastMatches.join(", ")}, schlage ein neues, kreatives Rezept für ein Abendessen vor. Gib den Namen, eine kurze Beschreibung, 5 Hauptzutaten und einen Bild-Prompt aus. Antworte auf Deutsch.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            imageKeywords: { type: Type.STRING }
          },
          required: ["title", "description", "ingredients", "imageKeywords"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
