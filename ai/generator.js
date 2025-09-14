// AI Content Generator with Hugging Face Mixtral Integration
import generateWithMixtral from '../generateCaption.js';

// Stop words for keyword extraction (fallback)
const stopWords = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
  'this', 'that', 'with', 'from', 'have', 'will', 'want', 'need', 'give', 'make', 'take', 'come', 'goes', 'went', 'gone', 'been', 'have', 'has', 'had', 'does', 'did', 'done', 'says', 'said', 'tell', 'told', 'know', 'knew', 'think', 'thought', 'feel', 'felt', 'look', 'looked', 'see', 'saw', 'seen', 'hear', 'heard', 'find', 'found', 'about', 'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom', 'whose', 'create', 'generate', 'write', 'something', 'based', 'first', 'web', 'project', 'memories', 'journeling', 'stories', 'caption', 'description', 'poetic', 'these', 'those', 'them', 'their', 'they', 'photo', 'photos', 'image', 'images', 'picture', 'pictures', 'some', 'many', 'few', 'several', 'various', 'different', 'same', 'other', 'another', 'each', 'every', 'both', 'either', 'neither', 'such', 'much', 'more', 'most', 'less', 'least', 'enough', 'too', 'very', 'quite', 'rather', 'just', 'only', 'even', 'still', 'also', 'again', 'ever', 'never', 'always', 'often', 'sometimes', 'usually', 'rarely', 'seldom', 'once', 'twice', 'thrice', 'times', 'time', 'times', 'year', 'years', 'month', 'months', 'week', 'weeks', 'day', 'days', 'hour', 'hours', 'minute', 'minutes', 'second', 'seconds', 'moment', 'moments', 'while', 'during', 'before', 'after', 'since', 'until', 'till', 'ago', 'now', 'then', 'today', 'yesterday', 'tomorrow', 'tonight', 'tonite', 'morning', 'afternoon', 'evening', 'night', 'midnight', 'noon', 'am', 'pm', 'a.m.', 'p.m.'
];

// Fallback templates (only used if Hugging Face fails)
const fallbackCaptions = [
  "A memory worth keeping",
  "This moment speaks to my heart",
  "A story worth telling",
  "Captured in time",
  "A chapter of my journey",
  "Memories that last",
  "A moment to cherish",
  "Life's beautiful moments",
  "A memory close to my heart",
  "This brings a smile to my face"
];

const fallbackDescriptions = [
  "This memory always brings a smile to my face. The gentle light, the soft laughter, and the feeling of being surrounded by those I care about make it unforgettable. Each detail is etched in my mind, from the warmth of the sun to the comfort of familiar voices. Even on the busiest days, thinking back to this moment brings a sense of peace. It reminds me that happiness is often found in the simplest times. These are the memories I hold close, the ones that shape who I am and fill my heart with gratitude.",
  "Looking at this, I feel a gentle warmth in my heart. The world seemed to slow down, letting me savor every second. There was a quiet joy in the air, a sense that everything was just as it should be. I remember the colors, the sounds, and the feeling of contentment that lingered long after. It's moments like these that remind me to appreciate the present. This memory is a gentle anchor, keeping me grounded and grateful for all that I have.",
  "Some memories linger long after they're made, and this is one of them. The laughter, the shared stories, and the sense of belonging are treasures I carry with me. Even as time moves on, the emotions remain vivid and real. I find comfort in recalling the small details—the way the light fell, the sound of familiar voices, the feeling of being understood. These moments are the foundation of my happiness. They remind me that life is made up of countless little joys, each one worth cherishing."
];

export const generateUniqueContent = async (userPrompt, currentCaption = '', currentDescription = '') => {
  try {
    // Try Hugging Face Mixtral first for intelligent, context-aware responses
    const result = await generateWithHuggingFace(userPrompt, currentCaption, currentDescription);
    if (result && result.caption && result.description) {
      return result;
    }
  } catch (error) {
    console.error('Hugging Face generation failed, using fallback:', error.message);
  }
  
  // Fallback to local templates if Hugging Face fails
  return generateFallbackContent(userPrompt, currentCaption, currentDescription);
};

async function generateWithHuggingFace(userPrompt, currentCaption, currentDescription) {
  try {
    // Detect intent from user prompt
    const isPoetic = /poetic|poetry|verse|lyric|song|magical|art|beautiful|breathtaking|dream|imagine|inspire/.test(userPrompt.toLowerCase());
    const isDescriptive = /description|summarize|explain|detail|expand|story|narrate|describe/.test(userPrompt.toLowerCase());
    
    // Create different prompts for caption vs description
    const captionPrompt = `Generate a short caption (max 10 words) for: ${userPrompt}. ${isPoetic ? 'Make it poetic.' : 'Make it personal.'}`;
    const descriptionPrompt = `Generate a detailed description (3-4 sentences) for: ${userPrompt}. ${isPoetic ? 'Write a poetic description.' : 'Write a personal description.'}`;

    // Generate caption and description using Hugging Face
    const [captionResponse, descriptionResponse] = await Promise.all([
      generateWithMixtral(captionPrompt),
      generateWithMixtral(descriptionPrompt)
    ]);

    // Clean up the responses
    const caption = captionResponse.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z0-9\s.,!?-]*$/, '').trim();
    const description = descriptionResponse.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z0-9\s.,!?-]*$/, '').trim();

    // Ensure we have valid responses with different content
    const finalCaption = caption && caption.length > 5 && caption.length < 50 ? caption : generateSmartCaption(userPrompt, isPoetic);
    const finalDescription = description && description.length > 20 ? description : generateSmartDescription(userPrompt, isPoetic);

    return {
      caption: finalCaption,
      description: finalDescription
    };

  } catch (error) {
    console.error('Hugging Face generation error:', error);
    // Use smart fallbacks if API fails
    const isPoetic = /poetic|poetry|verse|lyric|song|magical|art|beautiful|breathtaking|dream|imagine|inspire/.test(userPrompt.toLowerCase());
    return {
      caption: generateSmartCaption(userPrompt, isPoetic),
      description: generateSmartDescription(userPrompt, isPoetic)
    };
  }
}

function generateSmartCaption(userPrompt, isPoetic) {
  const lowerPrompt = userPrompt.toLowerCase();
  
  if (lowerPrompt.includes('web project') || lowerPrompt.includes('memories') || lowerPrompt.includes('stories')) {
    const captions = [
      "Digital memories, timeless stories.",
      "A journey through memories.",
      "Stories captured in pixels.",
      "Memories in digital form.",
      "A chapter of my story."
    ];
    return captions[Math.floor(Math.random() * captions.length)];
  }
  
  if (isPoetic) {
    const poeticCaptions = [
      "Poetry in motion.",
      "A moment of beauty.",
      "Captured in verse.",
      "The poetry of life.",
      "Beauty in pixels."
    ];
    return poeticCaptions[Math.floor(Math.random() * poeticCaptions.length)];
  }
  
  const defaultCaptions = [
    "A moment to remember.",
    "Captured in time.",
    "Memories that last.",
    "A story worth telling.",
    "Life's beautiful moments."
  ];
  return defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];
}

function generateSmartDescription(userPrompt, isPoetic) {
  const lowerPrompt = userPrompt.toLowerCase();
  
  if (lowerPrompt.includes('web project') || lowerPrompt.includes('memories') || lowerPrompt.includes('stories')) {
    const descriptions = [
      "A digital journey through memories and stories, captured in pixels and preserved in time. Every moment becomes a chapter in the story of life, every image a window into the past. This project represents the intersection of technology and human experience, where memories find their digital home.",
      "In this digital age, we preserve more than just images—we capture feelings, emotions, and the essence of what makes life beautiful. Every memory tells a story, every story connects us to our past and guides us toward our future. This is where technology meets the human heart.",
      "Memories are the threads that weave the fabric of our lives, and this digital space becomes the loom where we create our personal tapestry. Each moment captured here is not just stored but celebrated, transformed into something that speaks to the soul."
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
  
  if (isPoetic) {
    const poeticDescriptions = [
      "Like petals in the wind, this moment drifts through my heart, leaving a gentle fragrance of joy. Each memory is a verse in the poem of life, softly echoing with hope and beauty. The world becomes a canvas where emotions paint their stories.",
      "In the quiet spaces between pixels and code, we discover the profound poetry that exists in every moment of human experience. This digital canvas becomes more than just a medium for expression—it transforms into a sanctuary where the inexpressible finds its voice.",
      "The poetry of human existence finds its voice in this digital realm, where every moment becomes a verse in the grand poem of life. This sacred space transforms the ordinary into the extraordinary, allowing us to see the world through the lens of beauty and meaning."
    ];
    return poeticDescriptions[Math.floor(Math.random() * poeticDescriptions.length)];
  }
  
  const defaultDescriptions = [
    "A beautiful memory captured in time, filled with meaning and emotion. Every detail tells a story, every moment holds significance. This is where the past meets the present, creating something timeless.",
    "This memory speaks to the heart, reminding us of what truly matters. It's a testament to the beauty of human experience and the power of connection. Every glance brings back the warmth of that moment.",
    "Some memories linger long after they're made, and this is one of them. The laughter, the shared stories, and the sense of belonging are treasures I carry with me. Even as time moves on, the emotions remain vivid and real."
  ];
  return defaultDescriptions[Math.floor(Math.random() * defaultDescriptions.length)];
}

function generateFallbackContent(userPrompt, currentCaption, currentDescription) {
  // Simple fallback using local templates
  const randomCaption = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
  const randomDescription = fallbackDescriptions[Math.floor(Math.random() * fallbackDescriptions.length)];
  
  return {
    caption: randomCaption,
    description: randomDescription
  };
}
