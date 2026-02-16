
export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string; // "A", "B", "C", "D"
  explanation: string;
  image?: string;
}

export interface QuizStats {
  correct: number;
  total: number;
  startTime: number;
  endTime?: number;
}

export enum AiProvider {
  GEMINI = 'GEMINI',
  OLLAMA = 'OLLAMA'
}

export interface AppSettings {
  provider: AiProvider;
  ollamaHost: string;
  ollamaModel: string;
}

export enum AppView {
  LANDING = 'LANDING',
  CONFIG = 'CONFIG',
  PROCESSING = 'PROCESSING',
  SETUP = 'SETUP',
  QUIZ = 'QUIZ',
  RESULTS = 'RESULTS'
}
