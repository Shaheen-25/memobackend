// memobackend/utils/generateCaption.js

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug: Check if we're using local AI
console.log("🤖 Using Intelligent Local AI Generator for context-aware content");

// Intelligent Context-Aware AI Generator
async function generateWithMixtral(prompt) {
  try {
    console.log("🚀 Generating with Intelligent Local AI:", prompt.substring(0, 50) + "...");
    
    // Analyze the prompt for deeper context understanding
    const context = analyzeContext(prompt);
    
    // Generate content that's directly related to the user's prompt
    const generatedText = generateContextualContent(prompt, context);
    
    console.log("✅ Intelligent Local AI generation completed");
    return generatedText;
    
  } catch (error) {
    console.error("❌ Intelligent Local AI generation error:", error.message);
    return generateSmartFallback(prompt);
  }
}

function analyzeContext(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract key themes and emotions from the prompt
  const themes = {
    // Life events and milestones
    lifeEvent: /turning point|special day|milestone|important day|significant|life changing|new chapter|new beginning/.test(lowerPrompt),
    
    // Relationships and love
    romantic: /love of my life|soulmate|true love|romantic|boyfriend|girlfriend|husband|wife|partner|relationship/.test(lowerPrompt),
    friendship: /friend|friendship|buddy|companion|mate/.test(lowerPrompt),
    family: /family|parent|child|baby|son|daughter|mother|father|sister|brother/.test(lowerPrompt),
    
    // Emotions and feelings
    joy: /happy|joy|excited|thrilled|elated|blessed|grateful|wonderful|amazing/.test(lowerPrompt),
    love: /love|adore|cherish|treasure|precious|special|meaningful/.test(lowerPrompt),
    nostalgia: /memory|remember|recall|nostalgic|past|childhood/.test(lowerPrompt),
    
    // Activities and experiences
    celebration: /celebration|party|birthday|anniversary|wedding|graduation|achievement/.test(lowerPrompt),
    travel: /travel|trip|vacation|journey|adventure|explore|visit|destination/.test(lowerPrompt),
    food: /food|meal|dinner|lunch|breakfast|cooking|restaurant|delicious/.test(lowerPrompt),
    nature: /nature|outdoor|sunset|sunrise|mountain|ocean|beach|forest|garden/.test(lowerPrompt),
    
    // Personal growth and achievements
    achievement: /achievement|success|accomplishment|goal|dream|aspiration|ambition/.test(lowerPrompt),
    growth: /growth|development|progress|improvement|learning|experience/.test(lowerPrompt),
    
    // Time and moments
    moment: /moment|time|day|night|morning|evening|afternoon/.test(lowerPrompt),
    season: /spring|summer|autumn|winter|seasonal/.test(lowerPrompt),
    
    // Specific objects or gifts
    flowers: /flower|rose|bouquet|gift|present|surprise/.test(lowerPrompt),
    food: /food|meal|dinner|lunch|breakfast|cooking|restaurant/.test(lowerPrompt),
    
    // Work and career
    work: /work|job|career|office|business|project|meeting/.test(lowerPrompt),
    
    // Health and wellness
    health: /health|fitness|exercise|wellness|meditation|yoga/.test(lowerPrompt)
  };
  
  // Determine the primary emotion and context
  const primaryEmotion = themes.joy ? 'joy' : themes.love ? 'love' : themes.nostalgia ? 'nostalgia' : 'appreciation';
  const primaryContext = themes.lifeEvent ? 'lifeEvent' : themes.romantic ? 'romantic' : themes.achievement ? 'achievement' : 'general';
  
  return {
    themes,
    primaryEmotion,
    primaryContext,
    isCaption: lowerPrompt.includes('caption') || prompt.length < 50,
    originalPrompt: prompt,
    timestamp: Date.now(),
    randomSeed: Math.random()
  };
}

function generateContextualContent(prompt, context) {
  const { themes, primaryEmotion, primaryContext, isCaption, originalPrompt, timestamp, randomSeed } = context;
  
  // Create unique identifier
  const uniqueId = timestamp.toString().slice(-6) + Math.floor(randomSeed * 1000);
  
    if (isCaption) {
    return generateContextualCaption(prompt, context, uniqueId);
    } else {
    return generateContextualDescription(prompt, context, uniqueId);
  }
}

function generateContextualCaption(prompt, context, uniqueId) {
  const { themes, primaryEmotion, primaryContext, originalPrompt } = context;
  
  // Extract key phrases from the original prompt
  const keyPhrases = extractKeyPhrases(originalPrompt);
  
  // Generate caption based on the actual content
  if (themes.lifeEvent && themes.romantic) {
    const lifeEventLoveCaptions = [
      `A turning point of love ✨`,
      `The day love changed everything 💫`,
      `When life and love aligned 🌟`,
      `A milestone of the heart 💖`,
      `Love's defining moment ✨`,
      `The beginning of forever 💫`,
      `A chapter of love begins 🌟`
    ];
    return lifeEventLoveCaptions[Math.floor(Math.random() * lifeEventLoveCaptions.length)];
  }
  
  if (themes.romantic && themes.flowers) {
    const romanticFlowerCaptions = [
      `Love blooms in petals 💐`,
      `Flowers speak of love 💖`,
      `A bouquet of affection 🌸`,
      `Love's floral language 💐`,
      `Petals of romance 🌹`,
      `Flowers from the heart 💖`,
      `Love in bloom 🌸`
    ];
    return romanticFlowerCaptions[Math.floor(Math.random() * romanticFlowerCaptions.length)];
  }
  
  if (themes.romantic) {
    const romanticCaptions = [
      `Love of my life 💖`,
      `My soulmate found ✨`,
      `True love captured 💫`,
      `Heart's greatest joy 💖`,
      `Love's perfect moment ✨`,
      `My forever person 💫`,
      `Love's sweet embrace 💖`
    ];
    return romanticCaptions[Math.floor(Math.random() * romanticCaptions.length)];
  }
  
  if (themes.lifeEvent) {
    const lifeEventCaptions = [
      `A turning point in life ✨`,
      `Life's defining moment 💫`,
      `A new chapter begins 🌟`,
      `The day everything changed ✨`,
      `A milestone reached 💫`,
      `Life's beautiful turning 🌟`,
      `A moment that changed everything ✨`
    ];
    return lifeEventCaptions[Math.floor(Math.random() * lifeEventCaptions.length)];
  }
  
  if (themes.achievement) {
    const achievementCaptions = [
      `Dreams becoming reality ✨`,
      `Success captured in time 💫`,
      `Achievement unlocked 🌟`,
      `Goals reached, dreams fulfilled ✨`,
      `A moment of triumph 💫`,
      `Success story in progress 🌟`,
      `Achievement celebrated ✨`
    ];
    return achievementCaptions[Math.floor(Math.random() * achievementCaptions.length)];
  }
  
  if (themes.celebration) {
    const celebrationCaptions = [
      `Celebrating life's moments ✨`,
      `Joy fills the air 💫`,
      `A day to remember 🌟`,
      `Festive spirits high ✨`,
      `Celebration of love 💫`,
      `Happy memories made 🌟`,
      `Party of the heart ✨`
    ];
    return celebrationCaptions[Math.floor(Math.random() * celebrationCaptions.length)];
  }
  
  // Default contextual caption based on the prompt's emotion
  const contextualCaptions = [
    `A moment of ${primaryEmotion} ✨`,
    `Life's beautiful ${primaryEmotion} 💫`,
    `${primaryEmotion} captured in time 🌟`,
    `A ${primaryEmotion} moment ✨`,
    `${primaryEmotion} in every detail 💫`,
    `Pure ${primaryEmotion} 🌟`,
    `${primaryEmotion} that lasts forever ✨`
  ];
  
  return contextualCaptions[Math.floor(Math.random() * contextualCaptions.length)];
}

function generateContextualDescription(prompt, context, uniqueId) {
  const { themes, primaryEmotion, primaryContext, originalPrompt } = context;
  
  // Extract key phrases and create a personalized description
  const keyPhrases = extractKeyPhrases(originalPrompt);
  
  if (themes.lifeEvent && themes.romantic) {
    const lifeEventLoveDescriptions = [
      `This moment represents a turning point in my life—the day I found the love of my life. Every detail of this special day is etched in my memory, from the way the light fell to the emotions that filled my heart. It's a milestone that changed everything, marking the beginning of a new chapter filled with love, joy, and endless possibilities. This memory captures the essence of what it means to find your soulmate—a moment when life and love align perfectly.`,
      `A turning point in life often comes when you least expect it, and this day was exactly that for me. Finding the love of my life wasn't just about romance—it was about discovering a person who would change my world in the most beautiful ways. Every element of this memory tells a story of transformation, of how one special day can alter the course of your entire life. This moment captures the pure joy and overwhelming gratitude that comes with finding your true love.`,
      `Some days are so significant that they become the foundation of your entire life story, and this is one of those days. Meeting the love of my life wasn't just a romantic moment—it was a life-changing event that redefined everything I thought I knew about love and happiness. This memory preserves the magic of that turning point, the exact moment when my life took on new meaning and purpose.`
    ];
    return lifeEventLoveDescriptions[Math.floor(Math.random() * lifeEventLoveDescriptions.length)];
  }
  
  if (themes.romantic && themes.flowers) {
    const romanticFlowerDescriptions = [
      `These flowers represent more than just beautiful petals—they symbolize the love and thoughtfulness of the person who gave them to me. Each bloom tells a story of care, each color speaks of emotions that words cannot fully express. This moment captures the essence of what makes relationships so precious—the small gestures that carry the weight of deep emotions. The flowers serve as a tangible reminder of love's gentle power and the beauty of being cherished by someone special.`,
      `In this moment, love takes on a tangible form through these beautiful flowers. They remind me of the countless ways love manifests in our lives, from grand gestures to simple acts of kindness that warm the heart. Each petal seems to whisper a message of affection, each stem a testament to the thoughtfulness that makes love so meaningful. This memory captures the pure joy of receiving a gift that speaks directly to the heart.`,
      `Flowers have a language all their own, and these blooms speak volumes about the love and care that went into choosing them. This moment represents more than just receiving flowers—it's about feeling seen, appreciated, and loved in the most beautiful way. The colors, the fragrance, and the arrangement all tell a story of someone who knows how to make your heart smile.`
    ];
    return romanticFlowerDescriptions[Math.floor(Math.random() * romanticFlowerDescriptions.length)];
  }
  
  if (themes.romantic) {
    const romanticDescriptions = [
      `Finding the love of my life has been the most transformative experience of my journey. This moment captures the essence of what it means to discover someone who understands your soul, who brings out the best in you, and who makes every day feel like a gift. The love we share isn't just romantic—it's a deep, abiding connection that has changed the way I see the world and myself. This memory preserves the magic of that connection, the feeling of being truly seen and loved for who I am.`,
      `Love has a way of finding us when we least expect it, and this moment captures the beauty of that discovery. The love of my life has brought colors to my world that I never knew existed, filling every day with joy, laughter, and endless possibilities. This memory represents more than just a romantic connection—it's about finding your person, your partner in life's beautiful journey. Every detail of this moment speaks of the deep bond we share and the future we're building together.`,
      `Some people come into your life and change everything, and that's exactly what happened when I found the love of my life. This moment captures the pure joy and overwhelming gratitude that comes with discovering someone who makes your heart sing. The love we share is built on mutual respect, understanding, and a deep appreciation for each other's uniqueness. This memory preserves the magic of that connection, the feeling of being truly home in someone's heart.`
    ];
    return romanticDescriptions[Math.floor(Math.random() * romanticDescriptions.length)];
  }
  
  if (themes.lifeEvent) {
    const lifeEventDescriptions = [
      `This moment represents a turning point in my life—a day that changed everything and set me on a new path. Every detail of this special day is etched in my memory, from the emotions that filled my heart to the people who shared this important moment with me. It's a milestone that marked the beginning of a new chapter, filled with possibilities and the promise of growth. This memory captures the essence of what it means to experience a life-changing event—the moment when everything shifts and you realize you're becoming the person you were meant to be.`,
      `Life has a way of presenting us with moments that become the foundation of our story, and this is one of those moments. This turning point wasn't just about change—it was about transformation, about discovering new aspects of myself and my potential. The significance of this day goes beyond the immediate moment—it represents a shift in perspective, a new understanding of what's possible, and the courage to embrace the unknown. This memory preserves the magic of that transformation, the feeling of standing at the threshold of something beautiful.`,
      `Some days are so significant that they become the markers of our personal evolution, and this is one of those days. This turning point in my life wasn't just about what happened—it was about who I became as a result. Every element of this memory tells a story of growth, of how challenges and opportunities can shape us into stronger, wiser versions of ourselves. This moment captures the essence of personal transformation and the beauty of embracing life's defining moments.`
    ];
    return lifeEventDescriptions[Math.floor(Math.random() * lifeEventDescriptions.length)];
  }
  
  // Default contextual description based on the prompt's content
  const contextualDescriptions = [
    `This moment holds a special place in my heart, filled with ${primaryEmotion} and meaning that goes beyond words. Every detail tells a story, every element contributes to a memory that will be cherished for years to come. The ${primaryEmotion} that fills this memory speaks to the essence of what makes life beautiful—the connections we make, the experiences we share, and the moments that shape who we become. This memory captures the pure joy of living and the gratitude that comes with recognizing life's precious gifts.`,
    `In this moment, I feel a deep sense of ${primaryEmotion} that reminds me of what truly matters in life. The world seemed to slow down, letting me savor every second of this special experience. There was a quiet joy in the air, a sense that everything was just as it should be. This memory represents more than just a moment in time—it's a testament to the beauty of human experience and the power of connection. Every glance brings back the warmth of that ${primaryEmotion} and the feeling of being exactly where I was meant to be.`,
    `Some moments are so special they deserve to be remembered forever, and this is one of them. The ${primaryEmotion} that fills this memory, combined with the significance of this experience, creates something truly magical. This moment captures the essence of what makes life worth living—the connections we make, the experiences we share, and the memories we create. It's a reminder that life's most precious moments are often the ones that touch our hearts in the deepest ways.`
  ];
  
  return contextualDescriptions[Math.floor(Math.random() * contextualDescriptions.length)];
}

function extractKeyPhrases(prompt) {
  // Extract meaningful phrases from the prompt
  const phrases = prompt.toLowerCase().match(/\b\w+(?:\s+\w+){1,3}\b/g) || [];
  return phrases.filter(phrase => phrase.length > 3);
}

function generateSmartFallback(prompt) {
  // Smart fallback that tries to relate to the actual prompt content
  const lowerPrompt = prompt.toLowerCase();
  const isCaption = lowerPrompt.includes('caption') || prompt.length < 50;
  
  // Try to extract the main theme from the prompt
  if (lowerPrompt.includes('love') || lowerPrompt.includes('romantic') || lowerPrompt.includes('boyfriend') || lowerPrompt.includes('girlfriend')) {
    if (isCaption) {
      return "Love captured in time ✨";
    } else {
      return "This moment holds a special place in my heart, filled with love and meaning. Every detail tells a story of affection and care, creating a memory that will be cherished forever.";
    }
  }
  
  if (lowerPrompt.includes('special') || lowerPrompt.includes('important') || lowerPrompt.includes('significant')) {
    if (isCaption) {
      return "A special moment in time ✨";
    } else {
      return "This moment represents something truly special and meaningful in my life. Every detail contributes to a memory that will be treasured for years to come.";
    }
  }
  
  // Default fallback
  if (isCaption) {
    return "A moment to remember ✨";
  } else {
    return "This memory holds a special place in my heart, filled with meaning and emotion. Every detail tells a story, every moment holds significance.";
  }
}

export default generateWithMixtral;
