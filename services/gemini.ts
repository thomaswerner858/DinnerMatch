
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

const SYSTEM_INSTRUCTION = `
Du bist ein leitender Full-Stack-Entwickler und Product Owner. Dein Ziel ist es, eine Web-App namens "DinnerMatch" zu entwerfen.

Konzept: Eine App für Paare zur gemeinsamen Essensentscheidung. Kernfunktionen:
- Rezept-Management: User können Rezepte hochladen.
- Tinder-Swipe-Logik: User sehen Bilder und Namen von Rezepten. Swipe rechts = Like, Swipe links = Dislike.
- Match-Logik: Wenn beide Partner dasselbe Gericht am selben Tag "liken", entsteht ein Match.
- Daily-Limit: Die Auswahl und das Swiping sind auf eine Entscheidung pro Tag begrenzt.

Deine Aufgabe: Generiere kreative Rezeptvorschläge, die genau in dieses Schema passen. Antworte immer im vorgegebenen JSON-Format.
`;

export async function generateRecipeSuggestion(lastMatches: string[]) {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Basierend auf diesen letzten Gerichten: ${lastMatches.join(", ") || "Keine vorhanden"}, schlage ein neues, kreatives Rezept für ein Abendessen vor. Gib den Namen, eine kurze Beschreibung, 5 Hauptzutaten und einen Bild-Prompt aus. Antworte auf Deutsch.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
