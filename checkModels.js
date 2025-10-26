import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Error: GOOGLE_API_KEY not found in .env file.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Error fetching models:", response.status, response.statusText);
      console.error("Details:", JSON.stringify(errorBody, null, 2));
      return;
    }

    const data = await response.json();
    
    console.log("✅ Available Models for your API Key:");
    for (const model of data.models) {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        const modelName = model.name.replace('models/', '');
        console.log("- ", modelName);
      }
    }

  } catch (error) {
    console.error("A network or other error occurred:", error.message);
  }
}

listModels();