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

/**
 * Generate a newsflash using OpenAI's Chat Completion API (ChatGPT).
 * This provides more natural-sounding results than the deterministic utility above.
 *
 * Environment requirements:
 *   • process.env.OPENAI_API_KEY – your OpenAI secret key.
 *   • (optional) process.env.OPENAI_CHAT_MODEL – defaults to 'gpt-3.5-turbo'.
 *
 * @param {Object} opts
 * @param {string} opts.rawText     – Original user update text.
 * @param {string} opts.userName    – Full user name (will be referenced in the prompt).
 * @param {string} [opts.tone]      – Desired tone e.g. "serious", "humorous", "sarcastic" (defaults to "satirical").
 * @param {number} [opts.temperature] – OpenAI temperature (0–2). Defaults to 0.7 for some creativity.
 * @param {string} [opts.length]    – "short" or "long". Influences the prompt guideline.
 * @param {string} [opts.model]     – Override chat model (falls back to env or 'gpt-3.5-turbo').
 * @returns {Promise<string>}       – Generated newsflash text.
 */
const generateNewsflashGPT = async ({
  rawText,
  userName,
  tone = "satirical",
  temperature = 0.7,
  length = "short",
  model = process.env.OPENAI_CHAT_MODEL || "gpt-3.5-turbo",
}) => {
  // Basic validation reused from previous util
  const { isValid, errors } = validateNewsflashInputs(rawText, userName);
  if (!isValid) {
    throw new Error(`Invalid inputs: ${errors.join("; ")}`);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY env var is required to generate newsflash via ChatGPT"
    );
  }

  const systemPrompt =
    "You are an assistant that writes breaking-news style flashes for a social media app. Keep it concise, engaging, and formatted like a headline.";

  // Build the user content prompt with explicit instructions
  const userPrompt = `Write a ${tone.toLowerCase()} news flash in ${
    length === "long" ? "2-3 sentences" : "1 concise sentence"
  } reporting on the following user update as if it were breaking news. Avoid hashtags or mentions. End with proper punctuation.\n\nUser name: ${userName}\nUser update: ${rawText}`;

  const body = {
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(
      `OpenAI API error (${response.status}): ${errorPayload.slice(0, 200)}`
    );
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing content");
  }
  return content.trim();
};

module.exports = {
  generateNewsflash,
  generateNewsflashVariations,
  validateNewsflashInputs,
  generateNewsflashGPT,
};
