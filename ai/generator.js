import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure the API key is loaded before initializing
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not defined in the .env file.");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Define the model configuration once
const model = genAI.getGenerativeModel({
// Using the correct model name from your successful API call
  model: "gemini-pro-latest",
  generationConfig: {
    temperature: 0.9,
  },
});

export async function generateUniqueContent(userPrompt, currentCaption = "", currentDescription = "") {
  try {
    const prompt = `
      You are "Echo," a creative writer and storyteller for the app MemoCapsule.
      Your task is to generate three (3) distinct and high-quality options for a user's memory. Each option must include a short, impactful caption and a longer, more descriptive.
      
      **Persona & Tone:**
      - Write from a first-person perspective, as if you are the one experiencing the memory ("I will always remember...", "This moment felt like...").
      - Your tone should be deeply personal, vivid, and emotionally resonant. Use sensory details and storytelling techniques to bring the memory to life.
      
      **Content & Style Rules:**
      1.  **Caption:** Must be a short, engaging phrase that captures the core emotion. It must start with a capital letter. It should also be related to the context given by user.
      2.  **Description:** Must be a thoughtful paragraph of **at least four (4) lines**. It should expand on the user input, telling the story behind the moment. It should be as the user is telling about the input moment It must start with a capital letter.
      3.  **Contextual Relevance:** Analyze the user's topic below. Extract key themes, objects, and emotions, and weave them into your suggestions to make them highly relevant.
      4.  **Variety:** Ensure all three options are unique in their style, angle, and emotional focus. One could be witty, one nostalgic, one inspiring, etc.
      5.  **Avoid Clichés:** Do not use generic phrases like "making memories" or "cherish forever."

      **User's Topic:** "${userPrompt}"
      **User's Current Caption (to avoid):** "${currentCaption}"
      **User's Current Description (to avoid):** "${currentDescription}"

      **Your output must be a valid JSON array containing three objects, like this:**
      [
        { "caption": "First unique caption.", "description": "First unique description that is four lines long." },
        { "caption": "Second unique caption.", "description": "Second unique description that is four lines long." },
        { "caption": "Third unique caption.", "description": "Third unique description that is four lines long." }
      ]
    `;

    // Call the model with just the prompt
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Raw AI Response:", text); // Keep for debugging

    // Improved and more robust JSON parsing
    let jsonString = text;
    
    // Check for and remove markdown fences if they exist
    const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        jsonString = markdownMatch[1];
    }

    // Attempt to parse the cleaned string
    const generatedOptions = JSON.parse(jsonString.trim());
    
    if (!Array.isArray(generatedOptions)) {
        throw new Error("Parsed content is not a JSON array.");
    }

    return generatedOptions;

  } catch (error) {
    console.error("AI Generation Error:", error);
    // Return a structured fallback response
    return [
      {
        caption: "A moment to remember.",
        description: "This memory holds a special place in my heart, a reminder of a time filled with joy and meaning. Every detail tells a story that I will carry with me always. It's moments like these that truly define our journey.",
      },
    ];
  }
}