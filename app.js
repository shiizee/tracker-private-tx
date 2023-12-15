require('dotenv').config();
const fs = require('fs').promises;
const { ethers, WebSocketProvider, Contract, isAddress, MaxInt256, getAddress, Interface, formatEther } = require('ethers');
const { getEmbeddedLink, getMono, escapeMarkdownV2, 
  escapeMarkdown } = require('./src/tgBot/tgHelper');
const { getContractDetails } = require('./src/erc20Getter');
const { textHelper } = require('./src/textHelper');

const provider = new WebSocketProvider('ws://127.0.0.1:8546');
const baseTgBot = require('./src/tgBot/baseTgBot');

let ownerAbi = ['function owner() public view returns (address)'];
ownerAbi = new Interface(ownerAbi);

let ownersToken = new Map(); // owner, tokenAddress
let tokenOwners = new Map(); // tokenAddress, [owners];
let owners = new Set(); // owners / deployers
let foundTxs = new Set(); // txHashes

const OWNERS_TOKEN_PATH = './db/ownersToken.json';
const TOKEN_OWNERS_PATH = './db/tokenOwners.json';
const OWNERS_PATH = './db/owners.json';
const FOUND_TXS_PATH = './db/foundTxs.json';

async function initialiseData() {
  try {
    // Attempt to read the data from the JSON files
    const ownersTokenData = JSON.parse(await fs.readFile(OWNERS_TOKEN_PATH, 'utf8'));
    const tokenOwnersData = JSON.parse(await fs.readFile(TOKEN_OWNERS_PATH, 'utf8'));
    const ownersData = JSON.parse(await fs.readFile(OWNERS_PATH, 'utf8'));
    const foundTxsData = JSON.parse(await fs.readFile(FOUND_TXS_PATH, 'utf8'));

    // Initialize the maps and sets with the data
    ownersToken = new Map(Object.entries(ownersTokenData));
    tokenOwners = new Map(Object.entries(tokenOwnersData));
    owners = new Set(ownersData);
    foundTxs = new Set(foundTxsData);
  } catch (error) {
    // If the files don't exist, initialize empty maps and sets
    if (error.code === 'ENOENT') {
      ownersToken = new Map();
      tokenOwners = new Map();
      owners = new Set();
      foundTxs = new Set();
    } else {
      // If there's another error, log it
      console.error("Error initializing data: ", error);
    }
  }
}

async function saveData() {
  try {
    // Convert the maps and sets to arrays or objects for JSON serialization
    const ownersTokenData = Object.fromEntries(ownersToken);
    const tokenOwnersData = Object.fromEntries(tokenOwners);
    const ownersData = Array.from(owners);
    const foundTxsData = Array.from(foundTxs);

    // Write the data to the JSON files
    await fs.writeFile(OWNERS_TOKEN_PATH, JSON.stringify(ownersTokenData), 'utf8');
    await fs.writeFile(TOKEN_OWNERS_PATH, JSON.stringify(tokenOwnersData), 'utf8');
    await fs.writeFile(OWNERS_PATH, JSON.stringify(ownersData), 'utf8');
    await fs.writeFile(FOUND_TXS_PATH, JSON.stringify(foundTxsData), 'utf8');
  } catch (error) {
    console.error("Error saving data: ", error);
  }
}


// TODO: TRANSFER OWNERSHIP DETECTION

async function addToken(tokenAddress, msgId) {
  let foundOwners = [];
  const tokenAddy = tokenAddress.toLowerCase();

  async function getOwner() {
    try {
      const tokenContract = new Contract(tokenAddress, ownerAbi, provider);
      const owner = await tokenContract.owner();
      if (isAddress(owner)) {
        return owner;
      } else {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }

  async function getDeployer() {
    const currentBlock = await provider.getBlockNumber();
    // look at the last 10 blocks for the deployment;
    for (let i = currentBlock - 10; i < currentBlock; i++) {
      const blockTxs = (await provider.getBlock(i)).transactions;
      for (const txHash of blockTxs) {
        const tx = await provider.getTransaction(txHash);
        if (!(tx && tx.from)) continue;
        if (tx.to == null) {
          const txReceipt = await provider.getTransactionReceipt(txHash);
          if (txReceipt.to == null && tx.contractAddress != undefined
            && tx.contractAddress.toLowerCase == tokenAddress) {
            return tx.from;
          }
        }
      }
    }
    return undefined;
  }

  const actualOwner = await getOwner();
  if (actualOwner) foundOwners.push(actualOwner);
  else {
    const deployer = await getDeployer();
    if (deployer) foundOwners.push(actualOwner);
  }

  if (foundOwners.length == 0) return;
  foundOwners = foundOwners.map(addy => addy.toLowerCase());
  // foundOwners.push(msgId);
  for (const foundOwner of foundOwners) {
    owners.add(foundOwner);
    ownersToken.set(foundOwner, tokenAddress);
  }
  tokenOwners.set(tokenAddy, foundOwners);
  saveData();
}

process.on('addToken', async (info = { tokenAddress, msgId }) => {
  if (!isAddress(info.tokenAddress)) return;
  addToken(info.tokenAddress, info.msgId);
})

function removeToken(tokenAddress) {
  const addy = tokenAddress.toLowerCase();
  const ownerAddys = tokenOwners.get(addy);
  for (const ownerAddy of ownerAddys) {
    owners.delete(ownerAddy);
    ownersToken.delete(ownerAddy);
  }
  tokenOwners.delete(addy);

  saveData();
}

provider.on('pending', async txHash => {
  const tx = await provider.getTransaction(txHash);
  if (!(tx && tx.from)) return;
  const txFrom = tx.from.toLowerCase();
  if (owners.has(txFrom)) { // is public
    foundTxs.add(tx.hash);
  }
})

provider.on('block', async blockNumber => {
  const blockTxs = (await provider.getBlock(blockNumber)).transactions;
  for (const txHash of blockTxs) {
    const tx = await provider.getTransaction(txHash);
    if (!(tx && tx.from)) continue;
    const txFrom = tx.from.toLowerCase();
    if (owners.has(txFrom)) { // is whitelisted txFrom
      const token = ownersToken.get(txFrom);
      console.log('found tx for', token);
      if (foundTxs.has(tx.hash)) { // found in mempool first
        // console.log('is public', token);
      } else { // private
        const addy = getAddress(token);
        sendTokenMessage(addy, txFrom);
      }
      // delete the token info after 1 tx
      foundTxs.delete(tx.hash);
      removeToken(token);
    }
  }
})

async function sendTokenMessage(token, owner) {
  const addy = getAddress(token);
  const [symbol, name, owner2] = await getContractDetails(addy);
  let ownerBal = formatEther(await provider.getBalance(owner))
  ownerBal = textHelper.nFormatter(ownerBal, 2);
  let msg = getEmbeddedLink(`${symbol} | ${name}`, textHelper.getTokenLink(addy)) +
  `\n${getMono(`    ${addy}`)}\n` + 
  getEmbeddedLink(`owner: ${ownerBal}`, textHelper.getWalletLink(owner)) + `\n`+ getMono(`    ${owner}`);
  baseTgBot.sendMessage(process.env.CHAT_GRP, escapeMarkdownV2(msg));
}

initialiseData();

// addToken('0x9763C22798784DFda0A09a12fd332CC8B3788496')
console.log('Bot started at:', (new Date()).toString());
