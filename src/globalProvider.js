require('dotenv').config();
const { WebSocketProvider } = require('ethers');
const wsProvider = new WebSocketProvider(process.env.WS_PROVIDER);

module.exports = { wsProvider };
