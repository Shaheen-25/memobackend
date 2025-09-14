// memobackend/routes/ai.js
const express = require("express");
const router = express.Router();
const generateWithMixtral = require("../utils/generateCaption");

router.post("/generate", async (req, res) => {
  const { type, prompt } = req.body;

  if (!prompt || !type) {
    return res.status(400).json({ error: "Prompt and type required" });
  }

  const prefix = type === "caption" ? "Write an Instagram-style caption for this:" : "Write a poetic story based on this:";
  const fullPrompt = `${prefix} "${prompt}"`;

  const aiText = await generateWithMixtral(fullPrompt);

  res.json({ result: aiText });
});

module.exports = router;
