require('dotenv').config();
const { ethers, WebSocketProvider, Contract, isAddress, MaxInt256, getAddress, Interface } = require('ethers');

const provider = new WebSocketProvider('ws://127.0.0.1:8546');
const baseTgBot = require('./src/tgBot/baseTgBot');

let ownerAbi = ['function owner() public view returns (address)'];
ownerAbi = new Interface(ownerAbi);

let ownersToken = new Map(); // owner, tokenAddress
let tokenOwners = new Map(); // tokenAddress, [owners];
let owners = new Set(); // owners / deployers
let foundTxs = new Set(); // txHashes

// TODO: TRANSFER OWNERSHIP DETECTION

async function addToken(tokenAddress) {
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
  for (const foundOwner of foundOwners) {
    owners.add(foundOwner);
    ownersToken.set(foundOwner, tokenAddress);
  }
  tokenOwners.set(tokenAddy, foundOwners);
  // TODO: file saving
  // save owners
  // save tokenOwners
  // save ownersToken
}

process.on('addToken', async (tokenAddress) => {
  console.log('new token detected: ', tokenAddress);
  addToken(tokenAddress);
})

function removeToken(tokenAddress) {
  const addy = tokenAddress.toLowerCase();
  const ownerAddys = tokenOwners.get(addy);
  for (const ownerAddy of ownerAddys) {
    owners.delete(ownerAddy);
    ownersToken.delete(ownerAddy);
  }
  tokenOwners.delete(addy);

  // TODO: save the files
}

// TODO: save the files
async function saveFiles() {}

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
        baseTgBot.sendMessage(process.env.CHAT_GRP, ownersToken.get(txFrom));
      }
      // delete the token info after 1 tx
      removeToken(token);
    }
  }
})

// addToken('0x9763C22798784DFda0A09a12fd332CC8B3788496')
console.log('Bot started at:', Date.now().toString());
