const path = require("path");
const globalDir = path.resolve(__dirname, "../.hardhat-global");
process.env.APPDATA = process.env.APPDATA || globalDir;
process.env.LOCALAPPDATA = process.env.LOCALAPPDATA || globalDir;
process.env.HARDHAT_GLOBAL_DIR = process.env.HARDHAT_GLOBAL_DIR || globalDir;

require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
