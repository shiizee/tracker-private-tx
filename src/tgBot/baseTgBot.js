const { isAddress } = require('ethers');
const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

// removed some stuff so that it will still keep the formatting for tg.
// const reservedChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
const reservedChars = ['_', '~', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
const bot = new Telegraf(process.env.TG_BOT_TOKEN);

function getEmbeddedLink(phrase, link) {
  return `[${phrase}](${link})`
}

// removing markdown temporarily to check if anything is banned
function stripMarkdownChars(str) {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', ':'];
  let newStr = str;
  if (!newStr) return;
  for (const char of specialChars) {
      const regex = new RegExp('\\' + char, 'g');
      newStr = newStr.replace(regex, '');
  }
  return newStr;
}

function getMono(str) {
  return '\`' + str + '\`'
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMessage(chatId, message) {
  try {
    let sentMessage = await bot.telegram.sendMessage(chatId, message, { 
      parse_mode: 'MarkdownV2', 
      disable_web_page_preview: true
    });

    return sentMessage;
  } catch (error) {
    if (error.response && error.response.error_code === 429) {
      console.warn('Rate limit exceeded. Waiting for', error.response.parameters.retry_after, 'seconds.');
      await delay(error.response.parameters.retry_after * 5100); // Convert to milliseconds
      return sendMessage(chatId, message); // Retry after the delay
    } else {
      console.error('Error sending message:', error);
      // You can handle other types of errors here if necessary
    }
  }
}

async function editMessage(chatId, updatedMessage, messageId) {
  try {
    let editedMessage = await bot.telegram.editMessageText(chatId, messageId, null, updatedMessage, { 
      parse_mode: 'MarkdownV2', 
      disable_web_page_preview: true
    });

    return editedMessage;
  } catch (error) {
    if (error.response && error.response.error_code === 429) {
      console.warn('Rate limit exceeded. Waiting for', error.response.parameters.retry_after, 'seconds.');
      await delay(error.response.parameters.retry_after * 5100); // Convert to milliseconds
      return editMessage(chatId, messageId, updatedMessage); // Retry after the delay
    } else {
      console.error('Error editing message:', error);
      // You can handle other types of errors here if necessary
    }
  }
}

function escapeMarkdownV2(text) {
  let escapedText = text;
  for (const char of reservedChars) {
      const regex = new RegExp(`(?<!\\\\)\\${char}`, 'g');  // using a negative lookbehind to ensure the character isn't already escaped
      escapedText = escapedText.replace(regex, `\\${char}`);
  }
  return escapedText;
}

const escapeMarkdown = (str) => {
  // const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', ':'];
  const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!', ':'];
  return [...str].map(char => escapeChars.includes(char) ? '\\' + char : char).join('');
};

bot.on(message('text'), async(ctx) => {
  if (ctx.message.chat.id != Number(process.env.TOKENS_GRP)) return;
  const msg = ctx.message.text.split(' ');
  for (const str of msg) {
    if (isAddress(str)) process.emit('addToken', str);
  }
})

bot.launch();

module.exports = {
  sendMessage, escapeMarkdownV2, escapeMarkdown, editMessage, bot, getEmbeddedLink, getMono
};
