
import { GoogleGenAI, Type } from "@google/genai";

// Sicherer Check für den API Key
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

export async function generateRecipeSuggestion(lastMatches: string[]) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Kein Gemini API Key gefunden.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
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
