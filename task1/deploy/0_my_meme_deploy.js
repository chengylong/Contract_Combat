// 从 Hardhat 框架导入 deployments 和 getNamedAccounts 模块
// deployments 用于管理合约部署
// getNamedAccounts 用于获取预定义的账户
const {deployments, getNamedAccounts} = require("hardhat")
// 导出异步函数，接收解构的参数 这是 Hardhat 部署脚本的标准格式
module.exports = async({getNamedAccounts, deployments}) => {
    //  获取部署工具和账户
    const {deploy, log} = deployments
    const {firstAccount} = await getNamedAccounts()
    log("Deploying MyMemeToken contract...")
    log("firstAccount:", firstAccount)
    // 部署合约
    await deploy("MyMemeToken", {
        from: firstAccount,
        args: [],
        log: true,
        contract: "MyMemeToken"
    })
    log("MyMemeToken contract deployed successfully")
}
// 标签设置
module.exports.tags = ["all", "memetoken"]