const extractCharacters = (text) => {
  if (!text || text.length < 3) {
    return text; // Return original text if it's too short
  }

  // Extract first character
  const firstChar = text.charAt(0).toUpperCase();

  // Extract middle character
  const middleIndex = Math.floor(text.length / 2);
  const middleChar = text.charAt(middleIndex).toUpperCase();

  // Extract last character
  const lastChar = text.charAt(text.length - 1).toUpperCase();

  return firstChar + middleChar + lastChar;
};

module.exports = extractCharacters;
