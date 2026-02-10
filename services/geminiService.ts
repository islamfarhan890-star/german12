
import { GoogleGenAI, Type, Chat } from "@google/genai";
import { WordResult, SentenceAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchWord = async (word: string): Promise<WordResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze German word: "${word}". Include article for nouns, plural forms, and simple examples. Use Bengali for meanings and explanations.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          article: { type: Type.STRING, description: "der, die, or das. null if not a noun." },
          type: { type: Type.STRING, description: "Noun, Verb, Adjective, etc." },
          meaning_bn: { type: Type.STRING },
          meaning_en: { type: Type.STRING },
          plural_or_conjugation: { type: Type.STRING },
          plural_meaning_bn: { type: Type.STRING },
          synonym: { type: Type.STRING },
          synonym_meaning_bn: { type: Type.STRING },
          example_de: { type: Type.STRING },
          example_bn: { type: Type.STRING },
          img_prompt: { type: Type.STRING, description: "Prompt for an image generator representing this word." }
        },
        required: ["word", "type", "meaning_bn", "meaning_en", "example_de", "example_bn", "img_prompt"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const checkSentence = async (text: string): Promise<SentenceAnalysis> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Check this German sentence for grammar and logic: "${text}". Provide correction and explanation in Bengali.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          corrected: { type: Type.STRING },
          explanation: { type: Type.STRING },
          meaning: { type: Type.STRING },
          score: { type: Type.NUMBER, description: "Accuracy score from 0 to 100" }
        },
        required: ["isCorrect", "corrected", "explanation", "meaning", "score"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const startChatSession = (): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are a helpful and friendly German language tutor. Your goal is to help users learn German by answering their questions about grammar, vocabulary, culture, and pronunciation. Always respond in Bengali, but use German words and sentences for examples. Be encouraging and provide clear explanations.',
    },
  });
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A high quality, clear educational illustration of: ${prompt}` }] },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }
  return null;
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly in German: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO" as any],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (e) {
    console.error("Speech generation failed", e);
    return null;
  }
};
