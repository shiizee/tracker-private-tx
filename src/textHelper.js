class TextHelper {
  getChartLinkWithToken(tokenAddress) {
    return `https://etherscan.io/token/${tokenAddress}?chain=solana`
  }

  getTxLink(txHash) {
    return `https://etherscan.io/tx/${txHash}`
  }

  getTokenLink(tokenAddress) {
    return `https://etherscan.io/token/${tokenAddress}`
  }
  
  getWalletLink(walletAddress) {
    return `https://etherscan.io/address/${walletAddress}`
  }
  
  getChartWithPair(pairAddress) {

  }

  roundDp(someNumber, decimalPlace) {
    let num = someNumber;
    for (let i = 0; i < decimalPlace; i++) {
      num = num * 10 / 10
    }

    return Math.round(num);
  }

  nFormatter(num, digits) {
    const lookup = [
      { value: 1, symbol: "" },
      { value: 1e3, symbol: "k" },
      { value: 1e6, symbol: "M" },
      { value: 1e9, symbol: "G" },
      { value: 1e12, symbol: "T" },
      { value: 1e15, symbol: "P" },
      { value: 1e18, symbol: "E" }
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup.slice().reverse().find(function(item) {
      return num >= item.value;
    });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
  }
}

const textHelper = new TextHelper();

module.exports = { textHelper };
