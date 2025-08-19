const fs = require('fs');
const path = require('path');

module.exports = async({getNamedAccounts,deployments,ethers,upgrades})=>{
  
  // 创建质押合约工厂，代币合约
  const metaNodeStakeFac = await ethers.getContractFactory("MetaNodeStake")
  const metaNode = await ethers.getContract("MetaNodeToken")
      // 代币地址准备入参
  const metaNodeAddr = await metaNode.getAddress();
  console.log("metaNodeTokenAddr: ", metaNodeAddr);
      // 质押合约构造，uups代理模式
  const metaNodeStakeProxy  = await upgrades.deployProxy(
    metaNodeStakeFac,
    [metaNodeAddr,1,20000,ethers.parseEther("0.1")],
    {initializer:"initialize",kind:"uups"}
  );
  metaNodeStakeProxy.waitForDeployment
  // 代理地址用于外部交互
  const proxyAddress = await metaNodeStakeProxy.getAddress();
  // 实现地址，用于后续升级
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("proxy contract:", proxyAddress);
  console.log("implementation:", implAddress);
  //must save or can't get the deploy by name
    // 保存到 hardhat-deploy 的记录
    const {save} =deployments;
    await save("MetaNodeStake",{
      abi:metaNodeStakeProxy.interface.format("json"),
      address:proxyAddress
    })
    // 写入本地缓存文件
     const storePath = path.resolve(__dirname, "./.cache/MetaNodeStakeProxy.json");
    fs.writeFileSync(storePath, JSON.stringify({
        proxyAddress,
        implAddress,
        api: metaNodeStakeProxy.interface.format("json"),
    }));
};
// 标签
module.exports.tags = ["all", "MetaNodeStake"];