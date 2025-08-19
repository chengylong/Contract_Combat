require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy")
require("hardhat-deploy-ethers")
require("@openzeppelin/hardhat-upgrades")
require("dotenv").config()
// require("./task")
require("@typechain/hardhat")

/** @type import('hardhat/config').HardhatUserConfig */
const SEPOLIA_URL = process.env.SEPOLIA_URL
const PRIVATE_KEY_FIRST = process.env.PRIVATE_KEY_FIRST
const PRIVATE_KEY_SECOND = process.env.PRIVATE_KEY_SECOND
module.exports = {
    solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  // solidity: "0.8.28",

  namedAccounts: {
    firstAccount: 0,
    secondAccount: 1,
    thirdAccount: 2,
  },
  networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [PRIVATE_KEY_FIRST]
    }
  }
};
