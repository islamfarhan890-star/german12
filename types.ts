
export interface WordResult {
  word: string;
  article: 'der' | 'die' | 'das' | null;
  type: string;
  meaning_bn: string;
  meaning_en: string;
  plural_or_conjugation: string;
  plural_meaning_bn: string;
  synonym: string;
  synonym_meaning_bn: string;
  example_de: string;
  example_bn: string;
  img_prompt: string;
}

export interface SentenceAnalysis {
  isCorrect: boolean;
  corrected: string;
  explanation: string;
  meaning: string;
  score: number;
}

export type TabType = 'search' | 'notebook' | 'checker' | 'assistant';

export interface SavedWord extends WordResult {
  id: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
