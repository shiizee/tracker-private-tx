const { WebSocketProvider, Interface, Contract, getAddress } = require('ethers');
const { wsProvider } = require('./globalProvider');

const ERC_20_ABI = new Interface(require('../abi/erc20.json'));

async function getName(contract) {
  try {
    return await contract.name();
  } catch {
    return 'couldnt get name';
  }
}

async function getSymbol(contract) {
  try {
    return await contract.symbol();
  } catch {
    return 'couldnt get symbol';
  }
}

async function getOwner(contract) {
  try {
    return await contract.owner();
  } catch {
    return undefined;
  }
}

async function getContractDetails(addy) {
  const ca = new Contract(addy, ERC_20_ABI, wsProvider);
  return [
    await getSymbol(ca),
    await getName(ca),
    await getOwner(ca),
  ]
}

module.exports = {
  getContractDetails
}
