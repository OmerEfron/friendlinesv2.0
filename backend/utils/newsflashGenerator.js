// Newsflash generation utility
// Contains generateNewsflash() function for creating satirical news from user updates

/**
 * Generate a satirical newsflash from user input text
 * @param {string} rawText - The original user input
 * @param {string} userName - The user's full name
 * @returns {string} - Generated newsflash in news-style format
 */
const generateNewsflash = (rawText, userName) => {
  if (!rawText || !userName) {
    throw new Error("Both rawText and userName are required");
  }

  // Clean and normalize the input text
  const cleanText = rawText.trim();

  if (cleanText.length === 0) {
    throw new Error("Raw text cannot be empty");
  }

  // Convert to lowercase for processing, but preserve emojis and special characters
  let processedText = cleanText.toLowerCase();

  // Handle different types of updates with appropriate verb transformations
  const verbMappings = {
    // Present tense to past tense transformations
    "am ": "was ",
    "are ": "were ",
    "is ": "was ",
    "have ": "had ",
    "has ": "had ",
    "get ": "got ",
    "getting ": "got ",
    "go ": "went ",
    "going ": "went ",
    "eat ": "ate ",
    "eating ": "ate ",
    "drink ": "drank ",
    "drinking ": "drank ",
    "buy ": "bought ",
    "buying ": "bought ",
    "start ": "started ",
    "starting ": "started ",
    "finish ": "finished ",
    "finishing ": "finished ",
    "watch ": "watched ",
    "watching ": "watched ",
    "read ": "read ",
    "reading ": "read ",
    "play ": "played ",
    "playing ": "played ",
    "work ": "worked ",
    "working ": "worked ",
  };

  // Apply verb transformations
  Object.entries(verbMappings).forEach(([present, past]) => {
    if (processedText.includes(present)) {
      processedText = processedText.replace(new RegExp(present, "g"), past);
    }
  });

  // Handle first-person pronouns
  processedText = processedText.replace(/\bi\s/g, `${userName} `);
  processedText = processedText.replace(/\bme\b/g, `${userName}`);
  processedText = processedText.replace(/\bmy\b/g, `${userName}'s`);
  processedText = processedText.replace(/\bmyself\b/g, `${userName}`);

  // Handle contractions
  processedText = processedText.replace(/i'm/g, `${userName} is`);
  processedText = processedText.replace(/i've/g, `${userName} has`);
  processedText = processedText.replace(/i'll/g, `${userName} will`);
  processedText = processedText.replace(/i'd/g, `${userName} would`);

  // Capitalize first letter of the processed text
  processedText =
    processedText.charAt(0).toUpperCase() + processedText.slice(1);

  // Handle cases where the user name appears twice due to transformations
  const nameParts = userName.split(" ");
  const firstName = nameParts[0];

  // Replace multiple occurrences of the full name with just first name after the first occurrence
  const nameRegex = new RegExp(`(${userName}.*?)${userName}`, "gi");
  processedText = processedText.replace(nameRegex, `$1${firstName}`);

  // Generate the newsflash with appropriate prefix
  const prefixes = [
    "BREAKING:",
    "URGENT:",
    "DEVELOPING:",
    "EXCLUSIVE:",
    "ALERT:",
    "NEWS FLASH:",
  ];

  // Choose prefix based on content (simple heuristics)
  let prefix = "BREAKING:";
  if (processedText.includes("just") || processedText.includes("finally")) {
    prefix = "URGENT:";
  } else if (
    processedText.includes("working") ||
    processedText.includes("starting")
  ) {
    prefix = "DEVELOPING:";
  } else if (
    processedText.includes("secret") ||
    processedText.includes("surprise")
  ) {
    prefix = "EXCLUSIVE:";
  }

  // Construct the final newsflash
  let newsflash = `${prefix} ${processedText}`;

  // Ensure proper ending punctuation
  if (!newsflash.match(/[.!?]$/)) {
    newsflash += ".";
  }

  // Add timestamp indicator for extra "news" feeling
  const urgencyIndicators = [
    " - This story is developing...",
    " - More details to follow.",
    " - Sources confirm.",
    " - Breaking news update.",
    " - Live coverage continues.",
    "", // Sometimes no indicator
  ];

  // Randomly add urgency indicator (30% chance)
  if (Math.random() < 0.3) {
    const indicator =
      urgencyIndicators[Math.floor(Math.random() * urgencyIndicators.length)];
    newsflash += indicator;
  }

  return newsflash;
};

/**
 * Generate alternative newsflash variations for the same content
 * @param {string} rawText - The original user input
 * @param {string} userName - The user's full name
 * @returns {Array<string>} - Array of different newsflash variations
 */
const generateNewsflashVariations = (rawText, userName) => {
  const baseFlash = generateNewsflash(rawText, userName);

  // Create variations by changing the prefix and tone
  const variations = [
    baseFlash,
    baseFlash.replace("BREAKING:", "JUST IN:"),
    baseFlash.replace("BREAKING:", "CONFIRMED:"),
    baseFlash.replace("BREAKING:", "REPORT:"),
  ];

  return variations;
};

/**
 * Validate newsflash generation inputs
 * @param {string} rawText - The original user input
 * @param {string} userName - The user's full name
 * @returns {Object} - Validation result with isValid and errors
 */
const validateNewsflashInputs = (rawText, userName) => {
  const errors = [];

  if (!rawText || typeof rawText !== "string") {
    errors.push("Raw text is required and must be a string");
  } else if (rawText.trim().length === 0) {
    errors.push("Raw text cannot be empty");
  } else if (rawText.length > 280) {
    errors.push("Raw text cannot exceed 280 characters");
  }

  if (!userName || typeof userName !== "string") {
    errors.push("User name is required and must be a string");
  } else if (userName.trim().length === 0) {
    errors.push("User name cannot be empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  generateNewsflash,
  generateNewsflashVariations,
  validateNewsflashInputs,
};
