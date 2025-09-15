import express from 'express';
import { generateUniqueContent } from '../ai/generator.js'; // Correct import

const router = express.Router();

// POST /api/ai/caption
router.post('/caption', async (req, res) => {
  try {
    const { userPrompt, currentCaption, currentDescription } = req.body;
    const result = await generateUniqueContent(userPrompt, currentCaption, currentDescription);
    res.json(result);
  } catch (err) {
    res.status(500).json({ 
      error: "AI generation failed", 
      details: err.message,
    });
  }
});

export default router;