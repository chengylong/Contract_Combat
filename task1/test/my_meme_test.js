const {deployments, ethers, getNamedAccounts} = require("hardhat");
const {expect} = require("chai");
let myMemeToken;
// 在所有测试用例执行前运行一次
// 用于设置测试环境和初始化合约
before(async function () { 
    // 部署合约
    console.log("deploying...")
    await deployments.fixture(["all"]);
    console.log("deployed")
    console.log("testing...")
    // 获取账户和合约实例
    const {firstAccount, secondAccount, thirdAccount} = await getNamedAccounts();
    const lp = await ethers.getContract("LiquidityPool", firstAccount);
    console.log("lp deployed to:", lp.target);
    // 获取代币合约并授权 授权 LiquidityPool 合约使用 500,000 个代币（转换为 wei 单位）
    myMemeToken = await ethers.getContract("MyMemeToken", firstAccount);
    myMemeToken.approve(lp.target, ethers.parseEther("500000"));
    
    //调用下面函数时带上value，转入eth到这个合约，初始化流动性池
    console.log("balanceOf lp before:", await myMemeToken.balanceOf(lp.target))
    await lp.initLP({value: ethers.parseEther("10")})
    console.log("balanceOf lp after:", await myMemeToken.balanceOf(lp.target))
});
// 定义测试套件，名称为 "MyMeme"
describe("MyMeme", async function () { 
    //  第一个测试用例：购买代币
    it("buy meme", async function () { 
        // 获取账户和合约实例，使用 thirdAccount 连接到流动性池合约
        const {firstAccount, secondAccount, thirdAccount} = await getNamedAccounts();
        const userConnLp = await ethers.getContract("LiquidityPool", thirdAccount);
        // 执行购买操作发送 1 ETH 购买代币，打印购买前后流动性池子中的eth储备
        console.log("eth reserve before:", await userConnLp.lpEthReserve())
        await userConnLp.buyMeme({value: ethers.parseEther("1")})
        console.log("eth reserve after:", await userConnLp.lpEthReserve())
        // 检查流动性池合约中的代币余额
        console.log("balanceOf:", await myMemeToken.balanceOf(userConnLp.target))
        // 检查用户账户中的代币余额
        const userMemeBalance = await myMemeToken.balanceOf(thirdAccount)
        console.log("userMemeBalance:", userMemeBalance)
        // 断言用户获得了代币（余额大于0）
        expect(userMemeBalance).to.be.greaterThan(0)
    })

    it("sell meme", async function () {

        // sleep
        await new Promise(resolve => setTimeout(resolve, 10000));
        const {thirdAccount} = await getNamedAccounts();
        const userConnLp = await ethers.getContract("LiquidityPool", thirdAccount) 
        const userMeme = await ethers.getContract("MyMemeToken", thirdAccount)
        await userMeme.approve(userConnLp.target, ethers.parseEther("1"))

        const userMemeBalance = await userMeme.balanceOf(thirdAccount)
        console.log("balanceOf before:", await userMeme.balanceOf(thirdAccount))
        await userConnLp.sellMeme(ethers.parseEther("1"))
        console.log("balanceOf after:", await userMeme.balanceOf(thirdAccount))
        const sellAmount = userMemeBalance - await userMeme.balanceOf(thirdAccount)
        expect(sellAmount).to.be.equal(ethers.parseEther("1"))
    })

    // 添加流动性测试
it("addLiquidity", async function () { 
    const {firstAccount} = await getNamedAccounts();
    const ownerConnLp = await ethers.getContract("LiquidityPool", firstAccount);
    
    // 记录添加流动性前的状态
    const ethReserveBefore = await ownerConnLp.lpEthReserve();
    const memeReserveBefore = await myMemeToken.balanceOf(ownerConnLp.target);
    
    console.log("=== 添加流动性测试 ===");
    console.log("添加前 ETH 储备:", ethers.formatEther(ethReserveBefore));
    console.log("添加前 MEME 储备:", ethers.formatEther(memeReserveBefore));
    
    // 添加流动性：5 ETH + 10000 MEME
    const ethToAdd = ethers.parseEther("5");
    const memeToAdd = ethers.parseEther("10000");
    
    // 授权代币
    await myMemeToken.approve(ownerConnLp.target, memeToAdd);
    
    // 添加流动性
    await ownerConnLp.addLiquidity(memeToAdd, {value: ethToAdd});
    
    // 记录添加流动性后的状态
    const ethReserveAfter = await ownerConnLp.lpEthReserve();
    const memeReserveAfter = await myMemeToken.balanceOf(ownerConnLp.target);
    
    console.log("添加后 ETH 储备:", ethers.formatEther(ethReserveAfter));
    console.log("添加后 MEME 储备:", ethers.formatEther(memeReserveAfter));
    
    // 验证流动性池状态变化
    expect(ethReserveAfter).to.be.greaterThan(ethReserveBefore);
    expect(memeReserveAfter).to.be.greaterThan(memeReserveBefore);
    
    console.log("✅ 添加流动性测试通过");
})

// 移除流动性测试
it("removeLiquidity", async function () { 
    const {firstAccount} = await getNamedAccounts();
    const ownerConnLp = await ethers.getContract("LiquidityPool", firstAccount);
    
    // 记录移除流动性前的状态
    const ethReserveBefore = await ownerConnLp.lpEthReserve();
    const memeReserveBefore = await myMemeToken.balanceOf(ownerConnLp.target);
    const ownerEthBalanceBefore = await ethers.provider.getBalance(firstAccount);
    const ownerMemeBalanceBefore = await myMemeToken.balanceOf(firstAccount);
    
    console.log("=== 移除流动性测试 ===");
    console.log("移除前 ETH 储备:", ethers.formatEther(ethReserveBefore));
    console.log("移除前 MEME 储备:", ethers.formatEther(memeReserveBefore));
    console.log("移除前用户 ETH 余额:", ethers.formatEther(ownerEthBalanceBefore));
    console.log("移除前用户 MEME 余额:", ethers.formatEther(ownerMemeBalanceBefore));
    
    // 移除部分流动性（移除 1000 份额）
    const sharesToRemove = ethers.parseEther("1000");
    
    // 移除流动性
    await ownerConnLp.removeLiquidity(sharesToRemove);
    
    // 记录移除流动性后的状态
    const ethReserveAfter = await ownerConnLp.lpEthReserve();
    const memeReserveAfter = await myMemeToken.balanceOf(ownerConnLp.target);
    const ownerEthBalanceAfter = await ethers.provider.getBalance(firstAccount);
    const ownerMemeBalanceAfter = await myMemeToken.balanceOf(firstAccount);
    
    console.log("移除后 ETH 储备:", ethers.formatEther(ethReserveAfter));
    console.log("移除后 MEME 储备:", ethers.formatEther(memeReserveAfter));
    console.log("移除后用户 ETH 余额:", ethers.formatEther(ownerEthBalanceAfter));
    console.log("移除后用户 MEME 余额:", ethers.formatEther(ownerMemeBalanceAfter));
    
    // 验证流动性池状态变化
    expect(ethReserveAfter).to.be.lessThan(ethReserveBefore);
    expect(memeReserveAfter).to.be.lessThan(memeReserveBefore);
    
    // 验证用户余额增加
    expect(ownerEthBalanceAfter).to.be.greaterThan(ownerEthBalanceBefore);
    expect(ownerMemeBalanceAfter).to.be.greaterThan(ownerMemeBalanceBefore);
    
    console.log("✅ 移除流动性测试通过");
})
});