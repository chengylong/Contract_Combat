const {deployments, getNamedAccounts} = require("hardhat")

module.exports = async({getNamedAccounts, deployments}) => {
    // 获取部署工具和账户
    const {deploy, log} = deployments
    const {firstAccount, secondAccount} = await getNamedAccounts()
    // 获取之前部署的 MyMemeToken 合约实例
    // 记录该合约的地址到日志中
    const myMemeToken = await deployments.get("MyMemeToken")
    log("MyMemeToken contract address:", myMemeToken.address)
    log("Deploying lp contract...")
    log("firstAccount:", firstAccount)
    // 部署 LiquidityPool 合约
    await deploy("LiquidityPool", {
        from: firstAccount,
        // 参数含义：交易税率，该合约owner地址，关联代币合约地址
        args: [1, secondAccount, myMemeToken.address],
        log: true,
        contract: "LiquidityPool"
    })
    log("lp contract deployed successfully")
}
// 标签设置
module.exports.tags = ["all", "lp"]