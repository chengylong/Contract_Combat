require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require('@nomicfoundation/hardhat-ethers');
require('hardhat-deploy-ethers');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  namedAccounts: {
    firstAccount: 0,
    secondAccount: 1,
    thirdAccount: 2
  },
};