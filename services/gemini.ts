
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || "";
    }
  } catch (e) {
    console.error("Fehler beim Zugriff auf API_KEY:", e);
  }
  return "";
};

export async function generateRecipeSuggestion(lastMatches: string[]) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Basierend auf diesen letzten Gerichten: ${lastMatches.join(", ")}, schlage ein neues, kreatives Rezept für ein Abendessen vor. Gib den Namen, eine kurze Beschreibung, 5 Hauptzutaten und einen Bild-Prompt aus. Antworte auf Deutsch.`;

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

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}
