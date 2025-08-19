const {ethers} = require("hardhat")

/**
 * deploy MetaNodeToken
 * @param {*} param0 
 */
module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments
  const {firstAccount} = await getNamedAccounts()
  log("Deploying MetaNodeToken...")
  await deploy("MetaNodeToken", {
    from: firstAccount,
    args: [],
    log: true,
  })
  log(`MetaNodeToken deployed successfully`)

  log("Deploying MyStakeToken")
  await deploy("MyStakeToken",{
    from: firstAccount,
    args: [],
    log: true,
  })
    log(`MyStakeToken deployed successfully`)
};

module.exports.tags = ["all", "MetaNodeToken"];