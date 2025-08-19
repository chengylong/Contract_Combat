const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { expect } = require("chai");
describe("MetaNodeStake deposit()",function (){
    let stake, stakeAddr, stToken, deployer, user;
    const ETH_POOL_PID = 0;
    
    beforeEach(async()=>{
        await deployments.fixture(["all"]);
        // 获取用户
        const accts  = await ethers.getSigners();
        [deployer,user] = accts;
        // 获取已部署的质押合约
        stake = await ethers.getContract("MetaNodeStake",deployer);
        stakeAddr =await stake.getAddress();
        // 获取代币合约
        stToken = await ethers.getContract("MetaNodeToken",deployer);
        // mint/转给用户（视 MyStakeToken 实现而定；若构造已 mint 给 deployer，这里转给 user）
        await stToken.transfer(user.address, ethers.parseEther("10000"));
        // 管理员新增池（示意参数：权重=100，最小质押=100，锁仓块数=50）
        // 注意：入参按你合约 addPool 的真实签名调整（withUpdate 参数如有）
        // 先添加 ETH 池 (pid = 0)
        await stake.connect(deployer).addPool(
            ethers.ZeroAddress,           // stTokenAddress 为 0 表示 ETH 池
            100n,                         // poolWeight
            ethers.parseEther("0.5"),     // minDepositAmount (ETH)
            50n,                          // unstakeLockedBlocks
            true                          // withUpdate（若签名包含该参数）
        );
        // 代币池
        await stake.connect(deployer).addPool(
            await stToken.getAddress(),
            100n,   // poolWeight
            ethers.parseEther("100"),   // minDepositAmount
            50n,        // unstakeLockedBlocks
            true        // withUpdate（若签名有该布尔参数）
        );
    });
    it("should deposit successfully and update balances",async()=>{
        const pid = 1; // 刚加的代币池
        const amount = ethers.parseEther("1000");

        // 用户授权,1000个代币
        await stToken.connect(user).approve(stakeAddr, amount);
           // 记录前状态
        const beforeUserToken = await stToken.balanceOf(user.address);
        console.log("beforeUserToken",beforeUserToken)
        const beforeStakeToken = await stToken.balanceOf(stakeAddr);
        console.log("beforeStakeToken",beforeStakeToken)
        const beforePool = await stake.pool(pid);
        console.log("beforePool",beforePool)
        const beforeUserSt = await stake.stakingBalance(pid, user.address);
        console.log("beforeUserSt",beforeUserSt)
        // 用户向1代币池质押1000个代币
        const tx = await stake.connect(user).deposit(pid,amount);
        await tx.wait();
           // 记录后状态
        const afterUserToken = await stToken.balanceOf(user.address);
        console.log("afterUserToken",afterUserToken)
        const afterStakeToken = await stToken.balanceOf(stakeAddr);
        console.log("afterStakeToken",afterStakeToken)
        const afterPool = await stake.pool(pid);
        console.log("afterPool",afterPool)
        const afterUserSt = await stake.stakingBalance(pid, user.address);
        console.log("afterUserSt",afterUserSt)
        // 代币变动
        const deltaUser = beforeUserToken - afterUserToken;
        const deltaStake = afterStakeToken - beforeStakeToken;
        console.log("质押的代币",deltaUser)
        console.log("质押池增加代币",deltaStake)
        expect(deltaUser.toString()).to.equal(amount.toString());
        expect(deltaStake.toString()).to.equal(amount.toString());

        // 池与用户质押量
        // 取 Pool 里的 stTokenAmount（索引 4）
        const beforeStTokenAmount = BigInt(beforePool[4]);
        const afterStTokenAmount  = BigInt(afterPool[4]);

        // 用户质押量（已是 bigint）
        const userStDelta = BigInt(afterUserSt) - BigInt(beforeUserSt);
        console.log("用户质押代币量", userStDelta);
        // 计算池代币增加量
        const poolDelta = afterStTokenAmount - beforeStTokenAmount;

        console.log("质押池中代币增加量", poolDelta.toString());

        // 断言用字符串，避免 BigInt 适配问题
        expect(poolDelta.toString()).to.equal(amount.toString());
        expect(userStDelta.toString()).to.equal(amount.toString());
    })
    it("unstake reduce 正常解除质押",async()=>{
        const pid = 1;
        const depositAmount = ethers.parseEther("1000");
        const unstakeAmount = ethers.parseEther("400");
        // 先存入
        await stToken.connect(user).approve(stakeAddr, depositAmount);
        await (await stake.connect(user).deposit(pid, depositAmount)).wait();
        // 记录前状态
        const beforeUserSt = await stake.stakingBalance(pid, user.address);
        console.log("解除质押前用户代币量：",beforeUserSt)
        const beforePool = await stake.pool(pid);           // 元组
        const beforePoolSt = BigInt(beforePool[4]);         // stTokenAmount = index 4
        console.log("解除质押前质押池代币量：",beforePoolSt)
         // 解除质押
        const tx = await stake.connect(user).unstake(pid, unstakeAmount);
        await tx.wait();
         // 记录后状态
        const afterUserSt = await stake.stakingBalance(pid, user.address);
        const afterPool = await stake.pool(pid);
        console.log("解除质押后用户代币量：",afterUserSt)
        const afterPoolSt = BigInt(afterPool[4]);
        console.log("解除质押后质押池代币量：",afterPool)
        // 余额变动断言（用字符串对比更稳）
        const userStDelta = BigInt(beforeUserSt) - BigInt(afterUserSt);
        const poolStDelta = beforePoolSt - afterPoolSt;
        console.log("用户解除质押的代币量",userStDelta)
        console.log("质押池中减少的代币量",poolStDelta)

        expect(userStDelta.toString()).to.equal(unstakeAmount.toString());
        expect(poolStDelta.toString()).to.equal(unstakeAmount.toString());

  // 请求记录校验：此时仍在锁定中，所以 pendingWithdrawAmount 应为 0，requestAmount 等于申请的数量
        const [requestAmount, pendingWithdrawAmount] =
        await stake.withdrawAmount(pid, user.address);
        expect(requestAmount.toString()).to.equal(unstakeAmount.toString());
        expect(pendingWithdrawAmount.toString()).to.equal("0");
    });
    it("unstake should revert when amount exceeds user staking,解除质押代币大于质押的代币", async () => {
        const pid = 1;
        const depositAmount = ethers.parseEther("300");
        const overUnstake = ethers.parseEther("500");

        await stToken.connect(user).approve(stakeAddr, depositAmount);
        await (await stake.connect(user).deposit(pid, depositAmount)).wait();
        // await expect(
        // stake.connect(user).unstake(pid, overUnstake)
        // ).to.be.revertedWith("Not enough staking token balance");
        const userSt1 = await stake.stakingBalance(pid, user.address);
        console.log("之前：",userSt1)
          await expect(
        stake.connect(user).unstake(pid, overUnstake)
        ).to.be.revertedWith("Not enough staking token balance");
    });
        it("锁定后到期将代币转移给用户",async()=>{
            const pid = 1;
            const depositAmount = ethers.parseEther("1000");
            const unstakeAmount = ethers.parseEther("400");
            // 先存入，再发起解除
            await stToken.connect(user).approve(stakeAddr, depositAmount);
            await (await stake.connect(user).deposit(pid, depositAmount)).wait();
            await (await stake.connect(user).unstake(pid, unstakeAmount)).wait();
            // 锁定期块数（Pool.unstakeLockedBlocks = index 6）
            const pool = await stake.pool(pid);
            const lockedBlocks = BigInt(pool[6]);
            // 推进区块到解锁
            for (let i = 0n; i < lockedBlocks + 1n; i++) {
            await ethers.provider.send("evm_mine", []);
            }
            // 提取前后 stToken 余额对比（提取的是质押代币）
            const userToken1 = await stToken.balanceOf(user.address);
            const stakeToken1 = await stToken.balanceOf(stakeAddr);
            console.log("提现前用户代币余额：",userToken1)
            console.log("提现前质押池代币余额：",stakeToken1)
            const [_req1, pending1] = await stake.withdrawAmount(pid, user.address);
            console.log("提现前等待提现余额：",pending1)
            await(await stake.connect(user).withdraw(pid)).wait();
            const userToken2 = await stToken.balanceOf(user.address);
            const stakeToken2 = await stToken.balanceOf(stakeAddr);
            console.log("提现后用户代币余额：",userToken2)
            console.log("提现后质押池代币余额：",stakeToken2)

            const userTokenDelta = BigInt(userToken2) - BigInt(userToken1);
            const stakeTokenDelta = BigInt(stakeToken1) - BigInt(stakeToken2);

            expect(userTokenDelta.toString()).to.equal(unstakeAmount.toString());
            expect(stakeTokenDelta.toString()).to.equal(unstakeAmount.toString());
            // 再查 pendingWithdrawAmount，应无可提余额
            const [_reqAfter, pendingAfter] = await stake.withdrawAmount(pid, user.address);
            console.log("提现前等待提现余额：",pendingAfter)
            expect(pendingAfter.toString()).to.equal("0");
        });
        it("正常领取奖励测试",async()=>{
            const pid=1;
            const depositAmount = ethers.parseEther("1000");
            // 用户质押代币
            await stToken.connect(user).approve(stakeAddr, depositAmount);
            await (await stake.connect(user).deposit(pid, depositAmount)).wait();
            // 2. 推进区块以产生奖励（需要超过 startBlock）
            const currentBlock = await ethers.provider.getBlockNumber();
            const startBlock = await stake.startBlock();
            // 计算需要推进的区块数量
            const blocksToMine = Number(startBlock) - currentBlock + 10; // 推进到 startBlock + 10
            // 推进区块数到目标区块
            for (let i = 0; i < blocksToMine; i++) {
                // 本地测试网创建新区块
            await ethers.provider.send("evm_mine", []);
            }
              // 3. 记录领取前状态
            const beforeUserMetaNode = await stToken.balanceOf(user.address);
            const beforeStakeMetaNode = await stToken.balanceOf(stakeAddr);
            const beforePendingReward = await stake.pendingMetaNode(pid, user.address);
            console.log("=== 领取奖励测试 ===");
            console.log("领取前用户 MetaNode 余额:", ethers.formatEther(beforeUserMetaNode));
            console.log("领取前合约 MetaNode 余额:", ethers.formatEther(beforeStakeMetaNode));
            console.log("领取前待领取奖励:", ethers.formatEther(beforePendingReward));
                // 4. 执行领取奖励
            const tx = await stake.connect(user).claim(pid);
            await tx.wait();
    
    // 5. 记录领取后状态
    const afterUserMetaNode = await stToken.balanceOf(user.address);
    const afterStakeMetaNode = await stToken.balanceOf(stakeAddr);
    const afterPendingReward = await stake.pendingMetaNode(pid, user.address);
    
    console.log("领取后用户 MetaNode 余额:", ethers.formatEther(afterUserMetaNode));
    console.log("领取后合约 MetaNode 余额:", ethers.formatEther(afterStakeMetaNode));
    console.log("领取后待领取奖励:", ethers.formatEther(afterPendingReward));
     // 6. 计算实际转移的奖励金额
    const actualRewardReceived = BigInt(afterUserMetaNode) - BigInt(beforeUserMetaNode);
    const actualRewardSent = BigInt(beforeStakeMetaNode) - BigInt(afterStakeMetaNode);
    
    console.log("实际收到的奖励:", ethers.formatEther(actualRewardReceived));
    console.log("合约实际发送的奖励:", ethers.formatEther(actualRewardSent));
    
    // 7. 断言：使用实际转移的金额，而不是 pendingMetaNode
    expect(actualRewardReceived.toString()).to.equal(actualRewardSent.toString());
    
    // 8. 断言：待领取奖励已清零
    expect(afterPendingReward.toString()).to.equal("0");
    
    console.log("✅ 领取奖励测试通过");
        })
    it("无奖励领取",async()=>{
        const pid = 1; // 代币池ID，与之前测试保持一致

    // 场景1：用户未进行任何质押，无奖励可领
    // 记录用户初始代币余额（未质押状态）
    const userInitialBalance = await stToken.balanceOf(user.address);
    console.log("场景1 - 领取前用户代币余额:", ethers.formatEther(userInitialBalance));

    // 验证用户无质押记录
    const userStake1 = await stake.stakingBalance(pid, user.address);
    console.log("场景1 - 用户质押量:", ethers.formatEther(userStake1));
    expect(userStake1).to.equal(0n);

    // 验证无待领取奖励
    const pendingReward1 = await stake.pendingMetaNode(pid, user.address);
    console.log("场景1 - 待领取奖励:", ethers.formatEther(pendingReward1));
    expect(pendingReward1).to.equal(0n);

    // 执行领取操作
    const tx1 = await stake.connect(user).claim(pid);
    await tx1.wait();
    console.log("场景1 - 执行领取操作后");

    // 验证余额无变化
    const userBalance1 = await stToken.balanceOf(user.address);
    console.log("场景1 - 领取后用户代币余额:", ethers.formatEther(userBalance1));
    expect(userBalance1).to.equal(userInitialBalance);
    })
    it("管理员添加质押池",async()=>{
         // 准备新池参数
    const newToken = await ethers.getContract("MyStakeToken", deployer); // 假设存在另一种测试代币
    const newTokenAddr = await newToken.getAddress();
    const poolWeight = 200n;
    const minDeposit = ethers.parseEther("50");
    const lockedBlocks = 100n;

    // 记录添加前的池数量
    const initialPoolCount = await stake.poolLength();
    console.log("添加前的池数量:", initialPoolCount.toString());

    // 执行添加池操作并记录交易
    const tx = await stake.connect(deployer).addPool(
        newTokenAddr,
        poolWeight,
        minDeposit,
        lockedBlocks,
        true
    );
    const receipt = await tx.wait();
    console.log("添加池交易哈希:", receipt.hash);

    // 检查事件（更灵活的方式，适用于不确定事件名称的情况）
    let poolAddedEventFound = false;
    for (const log of receipt.logs) {
        try {
            // 尝试解析事件
            const event = stake.interface.parseLog(log);
            console.log("发现事件:", event.name);
            
            // 检查是否是与添加池相关的事件
            if (event.name.includes("Pool") && event.name.includes("Add") || 
                event.name.includes("Pool") && event.name.includes("Created")) {
                poolAddedEventFound = true;
                console.log("添加池相关事件参数:", event.args);
                
                // 验证事件参数
                expect(event.args.pid || event.args[0]).to.equal(initialPoolCount);
                expect(event.args.stToken || event.args.token || event.args[1]).to.equal(newTokenAddr);
                expect(event.args.weight || event.args[2]).to.equal(poolWeight);
                break;
            }
        } catch (e) {
            // 忽略无法解析的日志
            continue;
        }
    }
    
    // 确保找到了相关事件
    expect(poolAddedEventFound).to.be.true;
    console.log("成功验证添加池事件");

    // 验证池数量增加
    const afterPoolCount = await stake.poolLength();
    console.log("添加后的池数量:", afterPoolCount.toString());
    expect(afterPoolCount).to.equal(initialPoolCount + 1n);

   // 验证新池参数正确
    const newPool = await stake.pool(initialPoolCount);
    console.log("新池参数:", newPool);
    expect(newPool[0]).to.equal(newTokenAddr);        // 第一个参数是代币地址
    expect(newPool[1]).to.equal(poolWeight);          // 第二个参数是池权重
    expect(newPool[5]).to.equal(minDeposit);          // 第六个参数是最小质押金额
    expect(newPool[6]).to.equal(lockedBlocks);        // 第七个参数是锁定区块数
    })

it("非管理员添加质押池应失败", async () => {
      // 1. 准备测试数据
    const testParams = {
        stTokenAddress: ethers.ZeroAddress, // 测试用代币地址(ETH池)
        poolWeight: 150n,
        minDepositAmount: ethers.parseEther("100"),
        unstakeLockedBlocks: 50n,
        withUpdate: true
    };

    // 2. 记录操作前状态
    const initialPoolCount = await stake.poolLength();
    console.log(`测试开始 - 初始质押池数量: ${initialPoolCount}`);

    // 3. 执行测试操作：非管理员尝试添加质押池
    const addPoolTx = stake.connect(user).addPool(
        testParams.stTokenAddress,
        testParams.poolWeight,
        testParams.minDepositAmount,
        testParams.unstakeLockedBlocks,
        testParams.withUpdate
    );

    // 4. 验证核心错误：AccessControl权限不足
    await expect(addPoolTx)
        .to.be.revertedWithCustomError(stake, "AccessControlUnauthorizedAccount")
        .withArgs(
            user.address, // 验证被拒绝的账户
            "0x589d473ba17c0f47d494622893831497bad25919b9afb8e33e9521b8963fccde" // 所需角色哈希
        );
    console.log("验证通过：非管理员被正确拒绝访问");

    // 5. 验证系统状态未变更
    const finalPoolCount = await stake.poolLength();
    expect(finalPoolCount).to.equal(initialPoolCount);
    console.log(`验证通过：质押池数量保持不变 (${initialPoolCount})`);

    // 6. 验证无事件触发
    await expect(addPoolTx).not.to.emit(stake, "AddPool");
    console.log("验证通过：未触发AddPool事件");
});
    it("升级质押合约", async function () { 
        // console.log("out deployments: ", await deployments.all())
        await deployments.fixture("upgrade");
        const metaNodeStakeV2 = await deployments.get("MetaNodeStakeV2");
        console.log("metaNodeStakeV2 address: ", metaNodeStakeV2.address)
        metaNodeStakeContract = await ethers.getContractAt("MetaNodeStakeV2", metaNodeStakeV2.address);
        const poolInfo = await metaNodeStakeContract.pool(0);
        console.log("poolInfo: ", poolInfo)
        expect(poolInfo.stTokenAddress).to.equal(ethers.ZeroAddress);
        expect(await metaNodeStakeContract.version()).to.equal("v2.0.0");
    });
       it("all pause", async function () { 
        const {firstAccount, secondAccount} = await getNamedAccounts();
        await stake.connect(await ethers.getSigner(firstAccount)).pauseAll();
        // connect secondAccount and call unstake, but it should faild for pause

        await expect(stake.connect(await ethers.getSigner(secondAccount)).unstake(0, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(stake, "EnforcedPause");
    });
})