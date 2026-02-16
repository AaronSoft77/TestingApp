
import { GoogleGenAI, Type } from "@google/genai";
import { Question, AiProvider, AppSettings } from "../types";

/**
 * Utility to clean strings that might contain markdown JSON blocks
 */
const cleanJsonString = (str: string): string => {
  // Remove markdown code blocks if present (e.g., ```json ... ```)
  return str.replace(/```json\n?|```/g, '').trim();
};

const GEMINI_SCHEMA = {
  type: Type.ARRAY,
  description: 'An array of questions found in the image source.',
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The question text, exactly as it appears in the image." },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING }, 
        description: "An array of 4 multiple-choice options (e.g., ['A. ...', 'B. ...'])." 
      },
      correctAnswer: { 
        type: Type.STRING, 
        description: "The single uppercase letter (A, B, C, or D) of the correct answer." 
      },
      explanation: { 
        type: Type.STRING, 
        description: "A high-quality explanation based on Environmental Systems and Societies (ESS) principles." 
      },
    },
    required: ['text', 'options', 'correctAnswer', 'explanation'],
  }
};

export interface AiProcessResult {
  success: boolean;
  questions?: Question[];
  error?: string;
}

const processWithGemini = async (base64Data: string): Promise<AiProcessResult> => {
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) return { success: false, error: "Gemini API Key is missing in environment." };

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Data } },
          { text: "Analyze this image and extract all multiple-choice questions found. Transcribe them exactly. Return an array of question objects." }
        ]
      },
      config: {
        systemInstruction: "You are an expert IB Environmental Systems and Societies (ESS) examiner. Your task is to accurately transcribe test questions from images and provide correct answers with curriculum-aligned explanations.",
        responseMimeType: "application/json",
        responseSchema: GEMINI_SCHEMA,
      }
    });

    if (!response.text) throw new Error("Empty response from Gemini.");
    
    const questionsData = JSON.parse(cleanJsonString(response.text));
    return { success: true, questions: questionsData };
  } catch (err: any) {
    console.error("Gemini Error:", err);
    return { success: false, error: `Gemini Error: ${err.message || 'Unknown error'}` };
  }
};

const processWithOllama = async (base64Data: string, settings: AppSettings): Promise<AiProcessResult> => {
  const systemPrompt = "You are a specialized OCR and ESS curriculum assistant. Your only job is to extract multiple-choice questions from images into valid JSON arrays.";
  const userPrompt = `Extract ALL multiple-choice questions from this image exactly. 
  For each question, identify the correct answer (A, B, C, or D) and provide a professional ESS explanation.
  
  Return ONLY a JSON array of objects following this structure:
  [{
    "text": "The full question text",
    "options": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],
    "correctAnswer": "A",
    "explanation": "ESS-based reasoning"
  }]`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2-minute timeout for local inference

    const response = await fetch(`${settings.ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt: userPrompt,
        system: systemPrompt,
        images: [base64Data],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1, // Keep it deterministic for better extraction
          num_predict: 2048
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) return { success: false, error: `Ollama model '${settings.ollamaModel}' not found.` };
      return { success: false, error: `Ollama server error: ${response.statusText}` };
    }
    
    const data = await response.json();
    const cleanedJson = cleanJsonString(data.response);
    const questionsData = JSON.parse(cleanedJson);
    
    // Ensure the result is always an array
    const finalArray = Array.isArray(questionsData) ? questionsData : [questionsData];
    
    return { success: true, questions: finalArray };
  } catch (err: any) {
    console.error("Ollama Error:", err);
    if (err.name === 'AbortError') return { success: false, error: "Ollama inference timed out. Try a faster model or check your PC resources." };
    return { success: false, error: `Ollama Connection Error: Ensure Ollama is running at ${settings.ollamaHost}` };
  }
};

/**
 * Main entry point for processing an image into one or more Question objects.
 */
export const processImageToQuestions = async (base64Data: string, settings: AppSettings): Promise<Question[]> => {
  let result: AiProcessResult;

  if (settings.provider === AiProvider.OLLAMA) {
    result = await processWithOllama(base64Data, settings);
  } else {
    result = await processWithGemini(base64Data);
  }

  if (!result.success || !result.questions) {
    throw new Error(result.error || "Failed to process image.");
  }

  // Map processed data to the application's Question interface
  return result.questions.map(q => ({
    ...q,
    id: `q_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
    image: `data:image/jpeg;base64,${base64Data}`
  }));
};

/**
 * Helper to verify Ollama status in the UI
 */
export const checkOllamaConnection = async (host: string, model: string): Promise<{connected: boolean, modelFound: boolean}> => {
  try {
    const res = await fetch(`${host}/api/tags`);
    if (!res.ok) return { connected: false, modelFound: false };
    const data = await res.json();
    // Some models might have tags like 'llava:latest', so we do a partial match
    const modelExists = data.models?.some((m: any) => 
      m.name === model || m.name.split(':')[0] === model.split(':')[0]
    );
    return { connected: true, modelFound: !!modelExists };
  } catch (e) {
    return { connected: false, modelFound: false };
  }
};
