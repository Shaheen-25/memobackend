import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// The 'export' keyword is here, making this the only export needed.
export async function generateUniqueContent(userPrompt, currentCaption = "", currentDescription = "") {
  try {
    // Initialize the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // Craft the prompt with detailed instructions
    const prompt = `
      You are "Echo," a creative writer and storyteller for the app MemoCapsule.
      Your task is to generate three (3) distinct and high-quality options for a user's memory. Each option must include a short, impactful caption and a longer, more descriptive story.
      
      **Persona & Tone:**
      - Write from a first-person perspective, as if you are the one experiencing the memory ("I will always remember...", "This moment felt like...").
      - Your tone should be deeply personal, vivid, and emotionally resonant. Use sensory details and storytelling techniques to bring the memory to life.
      
      **Content & Style Rules:**
      1.  **Caption:** Must be a short, engaging phrase that captures the core emotion. It must start with a capital letter.
      2.  **Description:** Must be a thoughtful paragraph of **at least four (4) lines**. It should expand on the caption, telling the story behind the moment. It must start with a capital letter.
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
    // Call the model to generate content
    const result = await model.generateContent(prompt, {
      temperature: 0.9,
    });
    // Extract and parse the response
    const response = await result.response;
    const text = response.text();
    // Log the raw AI response for debugging
    console.log("Raw AI Response:", text);
    // Extract the JSON array from the response text
    if (text.includes('[') && text.includes(']')) {
      const jsonString = text.substring(text.indexOf('['), text.lastIndexOf(']') + 1);
      const generatedOptions = JSON.parse(jsonString);
      return generatedOptions;
    } else {
      throw new Error("AI did not return a valid JSON array.");
    }
    // Fallback in case of unexpected format
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [
      {
        caption: "A moment to remember.",
        description: "This memory holds a special place in my heart, a reminder of a time filled with joy and meaning. Every detail tells a story that I will carry with me always. It's moments like these that truly define our journey.",
      }
    ];
  }
}
