import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1";

async function generateCaption(prompt) {
  try {
    const response = await axios.post(
      HF_API_URL,
      {
        inputs: prompt,
        parameters: {
          max_new_tokens: 60,
          temperature: 0.7,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
        },
      }
    );

    const result = response.data;
    if (Array.isArray(result)) {
      return result[0]?.generated_text || "No caption generated.";
    }
    return result?.generated_text || "No caption generated.";
  } catch (error) {
    console.error("Error generating caption:", error.message);
    return "Failed to generate caption.";
  }
}

export { generateCaption };
