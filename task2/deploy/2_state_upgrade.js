const { ethers } = require("hardhat");
const path = require('path');
const fs = require('fs');
module.exports = async ({getNamedAccounts, deployments, upgrades}) => {
    const storePath = path.resolve(__dirname, "./.cache/MetaNodeStakeProxy.json");
    const soreData = fs.readFileSync(storePath);
    // 读取合约代理地址，合约实现地址，abi
    const {proxyAddress, implAddress, abi} = JSON.parse(soreData);
    const {deploy, log, save} = deployments
     const metaNodeStakeV2Fac = await ethers.getContractFactory("MetaNodeStakeV2")
    console.log("upgrading MetaNodeStake")
    const metaNodeStakeProxyV2 = await upgrades.upgradeProxy(
        proxyAddress,
        metaNodeStakeV2Fac,
        {kind:"uups"});
    await metaNodeStakeProxyV2.waitForDeployment();
    console.log("upgraded")
    console.log("MetaNodeStakeV2 deployed to:", await metaNodeStakeProxyV2.getAddress());
    console.log("MetaNodeStakeV2 implementation:", await upgrades.erc1967.getImplementationAddress(await metaNodeStakeProxyV2.getAddress()));
    const metaNodeStakeProxyCon = await ethers.getContractAt("MetaNodeStakeV2", await metaNodeStakeProxyV2.getAddress());
    console.log(`version: ${await metaNodeStakeProxyCon.version()}`)
    await save("MetaNodeStakeV2", {
    abi: metaNodeStakeProxyV2.interface.format("json"),
    address: (await metaNodeStakeProxyV2.getAddress())
  })
  console.log("MetaNodeStakeV2 deployed to:", await metaNodeStakeProxyV2.getAddress());
}
module.exports.tags = ["upgrade"];