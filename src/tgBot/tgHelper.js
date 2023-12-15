function getEmbeddedLink(phrase, link) {
  return `[${phrase}](${link})`
}

function getMono(str) {
  return '\`' + str + '\`'
}

// removed some stuff so that it will still keep the formatting for tg.
// const reservedChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
const reservedChars = ['_', '~', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];


function escapeMarkdownV2(text) {
  let escapedText = text;
  for (const char of reservedChars) {
      const regex = new RegExp(`(?<!\\\\)\\${char}`, 'g');  // using a negative lookbehind to ensure the character isn't already escaped
      escapedText = escapedText.replace(regex, `\\${char}`);
  }
  return escapedText;
}

/**
 * 
 * @param {str} str the msg string
 * @returns strict removal of markdown
 */
const escapeMarkdown = (str) => {
  // const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', ':'];
  const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', ':'];
  return [...str].map(char => escapeChars.includes(char) ? '\\' + char : char).join('');
};

module.exports = { getEmbeddedLink, getMono, reservedChars, escapeMarkdownV2, escapeMarkdown }
