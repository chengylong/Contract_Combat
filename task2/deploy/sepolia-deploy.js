const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("开始部署到Sepolia测试网...");

  // ----------------------
  // 1. 部署MetaNodeToken（普通ERC20合约）
  // ----------------------
  const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
  const token = await MetaNodeToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`MetaNodeToken部署成功，地址：${tokenAddr}`);

  // 验证代币合约（可选）
//   console.log("验证MetaNodeToken合约...");
//   await hre.run("verify:verify", {
//     address: tokenAddr,
//     constructorArguments: [] // 无构造函数参数
//   });

  // ----------------------
  // 2. 部署可升级的MetaNodeStake（使用UUPS代理）
  // ----------------------
  const MetaNodeStake = await ethers.getContractFactory("MetaNodeStake");
  
  // 部署代理合约并初始化（调用initialize函数）
  // 注意：初始化参数需与合约的initialize函数匹配
  const startBlock = await ethers.provider.getBlockNumber() + 100; // 100个区块后开始
  const endBlock = startBlock + 100000; // 持续100000个区块
  const metaNodePerBlock = ethers.parseEther("0.1"); // 每个区块奖励0.1个MetaNode

  const stakeProxy = await upgrades.deployProxy(
    MetaNodeStake,
    [
      tokenAddr,       // _MetaNode：代币地址
      startBlock,      // _startBlock：开始区块
      endBlock,        // _endBlock：结束区块
      metaNodePerBlock // _MetaNodePerBlock：每个区块奖励
    ],
    { 
      initializer: "initialize", // 指定初始化函数
      kind: "uups" // 匹配合约的UUPSUpgradeable
    }
  );
  await stakeProxy.waitForDeployment();
  const stakeProxyAddr = await stakeProxy.getAddress();
  console.log(`MetaNodeStake代理合约部署成功，地址：${stakeProxyAddr}`);

  // 验证逻辑合约（代理的实现合约）
  const implAddr = await upgrades.erc1967.getImplementationAddress(stakeProxyAddr);
  console.log(`MetaNodeStake逻辑合约地址：${implAddr}`);
  console.log("验证MetaNodeStake逻辑合约...");
//   await hre.run("verify:verify", {
//     address: implAddr,
//     constructorArguments: [] // 逻辑合约构造函数为空（使用initialize初始化）
//   });

  // ----------------------
  // 3. 初始化质押池（与测试逻辑一致）
  // ----------------------
  console.log("初始化质押池...");
  
  // 添加ETH池（pid=0，必须是第一个池）
  await stakeProxy.addPool(
    ethers.ZeroAddress, // stTokenAddress：ETH池用0地址
    100n,               // poolWeight：权重
    ethers.parseEther("0.5"), // minDepositAmount：最小质押0.5 ETH
    50n,                // unstakeLockedBlocks：锁仓50个区块
    true                // withUpdate：更新池状态
  );
  console.log("ETH池添加成功");

  // 添加代币池（pid=1，使用MetaNodeToken）
  await stakeProxy.addPool(
    tokenAddr,          // stTokenAddress：代币地址
    100n,               // poolWeight：权重
    ethers.parseEther("100"), // minDepositAmount：最小质押100个代币
    50n,                // unstakeLockedBlocks：锁仓50个区块
    true                // withUpdate：更新池状态
  );
  console.log("代币池添加成功");

  console.log("所有部署步骤完成！");
  console.log("====================================");
  console.log(`MetaNodeToken: ${tokenAddr}`);
  console.log(`MetaNodeStake代理: ${stakeProxyAddr}`);
  console.log(`开始区块: ${startBlock}`);
  console.log(`结束区块: ${endBlock}`);
  console.log("====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
