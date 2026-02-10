import { GoogleGenAI, Type, FunctionDeclaration, FunctionCallingConfigMode } from '@google/genai';
import { Platform } from 'react-native';
import { getLocale } from '@/i18n';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export const GEMINI_MODELS = {
  FLASH: 'gemini-2.5-flash-preview-09-2025',
  FLASH_LITE: 'gemini-2.5-flash-lite-preview-09-2025',
  PRO: 'gemini-3-flash-preview',
  FLASH_THINKING: 'gemini-2.5-flash-preview-09-2025',
} as const;

export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];

let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please set EXPO_PUBLIC_GEMINI_API_KEY in .env');
    }
    genAIClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return genAIClient;
}

export function resetGeminiClient(): void {
  genAIClient = null;
}

export function isGeminiAvailable(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 10;
}

export interface GenerateOptions {
  model?: GeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  responseSchema?: object;
  tools?: Array<{ functionDeclarations: FunctionDeclaration[] }>;
  functionCallingConfig?: {
    mode?: FunctionCallingConfigMode;
    allowedFunctionNames?: string[];
  };
  /** Set to false to skip automatic language instruction */
  language?: string | false;
}

export interface GenerateResult {
  text: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  error?: string;
}

function getLanguageInstruction(): string {
  const locale = getLocale();
  const languageMap: Record<string, string> = {
    en: 'English',
    th: 'Thai',
  };
  const language = languageMap[locale] || 'English';
  return `\n\nIMPORTANT: Respond in ${language} language only.`;
}

export async function generateContent(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  try {
    const client = getGeminiClient();
    
    const {
      model = GEMINI_MODELS.FLASH,
      temperature = 0.2,
      maxOutputTokens = 2048,
      responseMimeType = 'text/plain',
      responseSchema,
      tools,
      functionCallingConfig,
      language,
    } = options;

    // Append language instruction to prompt (unless explicitly disabled)
    const finalPrompt = language !== false 
      ? prompt + (language ? `\n\nIMPORTANT: Respond in ${language} language only.` : getLanguageInstruction())
      : prompt;

    const config: Record<string, unknown> = {
      temperature,
      maxOutputTokens,
      responseMimeType,
    };

    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    if (tools) {
      config.tools = tools;
    }

    if (functionCallingConfig) {
      config.toolConfig = {
        functionCallingConfig,
      };
    }

    const response = await client.models.generateContent({
      model,
      contents: finalPrompt,
      config,
    });

    // Debug logging for development
    if (__DEV__) {
      console.log('[Gemini] Response received:', {
        hasText: !!response.text,
        textLength: response.text?.length || 0,
        hasFunctionCalls: !!response.functionCalls,
        functionCallCount: response.functionCalls?.length || 0,
      });
    }

    // Extract text from response - handle various response formats
    let text = '';
    if (response.text) {
      text = response.text;
    } else if (response.candidates && response.candidates.length > 0) {
      // Fallback: try to extract from candidates
      const candidate = response.candidates[0];
      if (candidate.content?.parts) {
        text = candidate.content.parts
          .filter((p: { text?: string }) => p.text)
          .map((p: { text?: string }) => p.text)
          .join('');
      }
    }

    return {
      text,
      functionCalls: response.functionCalls?.map(fc => ({
        name: fc.name || '',
        args: fc.args as Record<string, unknown>,
      })) || undefined,
    };
  } catch (error) {
    console.error('Gemini generation error:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function generateStructuredContent<T>(
  prompt: string,
  schema: object,
  options: Omit<GenerateOptions, 'responseMimeType' | 'responseSchema'> = {}
): Promise<{ data: T | null; error?: string }> {
  try {
    const result = await generateContent(prompt, {
      ...options,
      responseMimeType: 'application/json',
      responseSchema: schema,
    });

    if (result.error) {
      console.warn('[Gemini] Generation error:', result.error);
      return { data: null, error: result.error };
    }

    // Handle empty or whitespace-only responses
    const trimmedText = result.text?.trim();
    if (!trimmedText) {
      console.warn('[Gemini] Empty response received');
      return { data: null, error: 'Empty response from AI' };
    }

    // Try to parse JSON
    try {
      const data = JSON.parse(trimmedText) as T;
      return { data };
    } catch (parseError) {
      console.warn('[Gemini] JSON parse error:', parseError);
      console.warn('[Gemini] Raw response:', trimmedText.substring(0, 200));
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1].trim()) as T;
          return { data };
        } catch {
          // Fall through to error
        }
      }
      
      return {
        data: null,
        error: `Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error('[Gemini] Unexpected error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export { Type, FunctionCallingConfigMode };
export type { FunctionDeclaration };
