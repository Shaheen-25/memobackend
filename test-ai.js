// Test AI Generation
const testAI = () => {
  // Extract meaningful words from user's prompt
  const extractKeyWords = (text) => {
    const words = text.toLowerCase().split(' ');
    const meaningfulWords = words.filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'from', 'have', 'will', 'want', 'need', 'give', 'make', 'take', 'come', 'goes', 'went', 'gone', 'been', 'have', 'has', 'had', 'does', 'did', 'done', 'says', 'said', 'tell', 'told', 'know', 'knew', 'think', 'thought', 'feel', 'felt', 'look', 'looked', 'see', 'saw', 'seen', 'hear', 'heard', 'find', 'found', 'get', 'got', 'gotten', 'give', 'gave', 'given', 'take', 'took', 'taken', 'come', 'came', 'go', 'went', 'gone', 'get', 'got', 'gotten', 'make', 'made', 'do', 'did', 'done', 'say', 'said', 'tell', 'told', 'know', 'knew', 'think', 'thought', 'feel', 'felt', 'look', 'looked', 'see', 'saw', 'seen', 'hear', 'heard', 'find', 'found', 'and', 'the', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
    );
    return meaningfulWords.slice(0, 5); // Take first 5 meaningful words
  };

  // Create dynamic caption from user's words
  const createDynamicCaption = (words, themes) => {
    const timestamp = Date.now().toString().slice(-4); // Last 4 digits for uniqueness
    
    if (themes.poetic && words.length >= 2) {
      const poeticTemplates = [
        `Whispers of ${words[0]} in ${words[1]} dreams`,
        `Emotions painted in ${words[0]} and ${words[1]}`,
        `A sonnet of ${words[0]}, written in ${words[1]}`,
        `The poetry of ${words[0]}, captured in ${words[1]}`,
        `Verses of ${words[0]}, etched in ${words[1]}`
      ];
      const template = poeticTemplates[Math.floor(Math.random() * poeticTemplates.length)];
      return `${template} - ${timestamp}`;
    }
    
    // Fallback: use user's words with creative template
    if (words.length >= 2) {
      return `${words[0].charAt(0).toUpperCase() + words[0].slice(1)} captured in ${words[1]} - ${timestamp}`;
    } else if (words.length >= 1) {
      return `${words[0].charAt(0).toUpperCase() + words[0].slice(1)} in digital dreams - ${timestamp}`;
    } else {
      return `A moment worth remembering - ${timestamp}`;
    }
  };

  // Test prompts
  const testPrompts = [
    "create something poetic about memories",
    "make it poetic for my story",
    "enhance this with emotional feel",
    "generate a caption for my journey"
  ];

  console.log("🧪 Testing AI Generation:");
  console.log("==========================");

  testPrompts.forEach((prompt, index) => {
    console.log(`\nTest ${index + 1}: "${prompt}"`);
    
    const words = extractKeyWords(prompt);
    const themes = {
      poetic: prompt.toLowerCase().includes('poetic') || prompt.toLowerCase().includes('poetry'),
      memory: prompt.toLowerCase().includes('memory') || prompt.toLowerCase().includes('memories'),
      story: prompt.toLowerCase().includes('story') || prompt.toLowerCase().includes('stories')
    };
    
    const caption = createDynamicCaption(words, themes);
    
    console.log(`Words extracted: [${words.join(', ')}]`);
    console.log(`Themes detected:`, themes);
    console.log(`Generated caption: "${caption}"`);
  });
};

testAI(); 