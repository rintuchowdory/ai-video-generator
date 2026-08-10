import axios, { AxiosInstance } from "axios";
import { ENV } from "./_core/env";

export interface StoryboardScene {
  sceneNumber: number;
  narration: string;
  visualPrompt: string;
}

export interface Storyboard {
  scenes: StoryboardScene[];
}

class GroqClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = ENV.groqApiKey;
    this.client = axios.create({
      baseURL: ENV.groqApiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Generate a storyboard from a topic using Groq
   */
  async generateStoryboard(topic: string, language: "de" | "en"): Promise<Storyboard> {
    if (!this.apiKey) {
      throw new Error("Groq API key not configured");
    }

    const systemPrompt = this.getSystemPrompt(language);
    const userPrompt = this.getUserPrompt(topic, language);

    try {
      const response = await this.client.post("", {
        model: ENV.groqModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Groq");
      }

      return this.parseStoryboard(content, language);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.message;
      throw new Error(`Groq storyboard generation failed: ${message}`);
    }
  }

  private getSystemPrompt(language: "de" | "en"): string {
    if (language === "de") {
      return `Du bist ein kreativer Drehbuchautor, der Marketingthemen in detaillierte Storyboards umwandelt.
Deine Aufgabe ist es, ein Thema in 4-5 Szenen aufzuteilen, wobei jede Szene:
1. Eine kurze Narration (1-2 Sätze) für den Voice-Over enthält
2. Einen detaillierten visuellen Prompt (3-4 Sätze) für die Videogenerierung enthält

Formatiere die Antwort als JSON-Array mit folgendem Schema:
[
  {
    "sceneNumber": 1,
    "narration": "Narration text",
    "visualPrompt": "Visual description for video generation"
  },
  ...
]

Achte darauf, dass:
- Die Narration klar, prägnant und marketingorientiert ist
- Die visuellen Prompts spezifisch, detailliert und für KI-Videogenerierung optimiert sind
- Die Szenen eine logische Geschichte erzählen
- Jede Szene zwischen 2-5 Sekunden dauert`;
    } else {
      return `You are a creative screenwriter who transforms marketing topics into detailed storyboards.
Your task is to split a topic into 4-5 scenes, where each scene:
1. Contains a brief narration (1-2 sentences) for voice-over
2. Contains a detailed visual prompt (3-4 sentences) for video generation

Format the response as a JSON array with the following schema:
[
  {
    "sceneNumber": 1,
    "narration": "Narration text",
    "visualPrompt": "Visual description for video generation"
  },
  ...
]

Make sure that:
- The narration is clear, concise, and marketing-oriented
- The visual prompts are specific, detailed, and optimized for AI video generation
- The scenes tell a logical story
- Each scene lasts between 2-5 seconds`;
    }
  }

  private getUserPrompt(topic: string, language: "de" | "en"): string {
    if (language === "de") {
      return `Erstelle ein Storyboard für folgendes Marketingthema:\n\n"${topic}"\n\nGeneriere 4-5 Szenen mit Narration und visuellen Prompts.`;
    } else {
      return `Create a storyboard for the following marketing topic:\n\n"${topic}"\n\nGenerate 4-5 scenes with narration and visual prompts.`;
    }
  }

  private parseStoryboard(content: string, language: "de" | "en"): Storyboard {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const scenes = JSON.parse(jsonMatch[0]) as StoryboardScene[];

      // Validate and normalize scenes
      const validatedScenes = scenes.map((scene, index) => ({
        sceneNumber: scene.sceneNumber || index + 1,
        narration: scene.narration || "",
        visualPrompt: scene.visualPrompt || "",
      }));

      return {
        scenes: validatedScenes,
      };
    } catch (error) {
      throw new Error(`Failed to parse storyboard: ${error}`);
    }
  }
}

export const groqClient = new GroqClient();
