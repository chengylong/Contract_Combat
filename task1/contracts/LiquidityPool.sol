// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {MyMemeToken} from "./MyMemeToken.sol";

contract LiquidityPool { 
    using Math for uint256;

    MyMemeToken private myMemeToken;

     //此合约的拥有者，暂时认为是管理员
    address public owner;
    // 交易税地址
    address public taxAddress;

    // 最大交易税比例
    uint constant MAX_TAX_RATE = 4;

    // 交易税比例
    uint256 public taxRate;

    struct LPAmount {
        // 流动池ETH持有量
        uint ethLPReserve;

        // 流动池MEME持有量
        uint memeLPReserve;

        // 流动池总份额
        uint totalLPShares;

        // 每个地址持有的LP份额
        mapping(address => uint) lpShares;
    }

    LPAmount private _lpAmount;
    // 权限修饰
     modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }
    // 构造器
      constructor(uint _taxRatio, address _taxAddr, address _memeTokenAddr) {
        owner = msg.sender;
        require(_taxRatio <= MAX_TAX_RATE, "Tax ratio is too high.");
        taxAddress = _taxAddr;
        taxRate = _taxRatio;
        myMemeToken = MyMemeToken(_memeTokenAddr);
        require(myMemeToken.getOwner() == owner, "Meme token owner is not contract owner.");
    }

      //初始化流动性池，将部分币加入流动性池，必须提前调用setup
    function initLP() external payable onlyOwner {
        require(_lpAmount.totalLPShares == 0, "LP already initialized");
        addLiquidity(500000 ether);
    }

    
    // 添加流动性
    function addLiquidity(uint memeAmount) public payable onlyOwner() {
        require(memeAmount > 0 && msg.value > 0, "memeAmount must be greater than 0");
        // 从调用者账户转移指定数量的 MEME 代币到流动性池合约
        // 重要: 调用者必须事先对合约进行 approve 授权
        // address(this) 是流动性池合约的地址
        myMemeToken.transferFrom(msg.sender, address(this), memeAmount);
        uint sharesToAdd;
        // 情况1: 首次添加流动性（池子为空）
        // 使用几何平均数：√(ETH数量 × MEME数量)
        // 这是 AMM 的标准做法，确保初始份额的公平性
        // 例如：如果添加 100 ETH 和 1000 MEME，份额 = √(100 × 1000) = √100,000 ≈ 316.23
        if (_lpAmount.totalLPShares == 0) {
            sharesToAdd = Math.sqrt(msg.value * memeAmount);
        } else {
            // ETH 份额计算:
            // 公式：(新ETH数量 × 总LP份额) ÷ 当前ETH储备
            // 含义：如果只添加 ETH，能获得多少 LP 份额
            uint ethShares = (msg.value * _lpAmount.totalLPShares) / _lpAmount.ethLPReserve;

            // MEME 份额计算
            // 公式：(新MEME数量 × 总LP份额) ÷ 当前MEME储备
            // 含义：如果只添加 MEME，能获得多少 LP 份额
            uint memeShares = (memeAmount * _lpAmount.totalLPShares) / _lpAmount.memeLPReserve;

            // 最终份额
            // 取两者的平均值
            // 这要求用户按池子当前比例提供流动性
            sharesToAdd = (ethShares + memeShares) / 2;
        }
        // 流动池总份额
        _lpAmount.totalLPShares += sharesToAdd;
        // 流动池ETH持有量
        _lpAmount.ethLPReserve += msg.value;
        // 流动池MEME持有量
        _lpAmount.memeLPReserve += memeAmount;
        // 每个地址持有的LP份额
        _lpAmount.lpShares[msg.sender] += sharesToAdd;
    }

        // 移除流动性
    function removeLiquidity(uint _shareToRemove) public onlyOwner() {
        // 确保用户要移除的份额不超过其拥有的份额
        require(_shareToRemove <= _lpAmount.lpShares[msg.sender], "Insufficient LP shares");
            // ETH 移除份额计算:
            // 比例计算: (移除份额 × 总ETH储备) ÷ 总LP份额
            // 含义: 根据份额比例计算应返还的 ETH 数量
            // 原理: 每个 LP 份额代表池子总资产的一定比例
        uint ethToRemove = (_shareToRemove * _lpAmount.ethLPReserve) / _lpAmount.totalLPShares;
        // meme代币计算
        // 比例计算: (移除份额 × 总MEME储备) ÷ 总LP份额
        // 含义: 根据份额比例计算应返还的 MEME 代币数量
        // 原理: 与 ETH 计算逻辑相同，确保按比例返还
        uint memeToRemove = (_shareToRemove * _lpAmount.memeLPReserve) / _lpAmount.totalLPShares;
        // 1. 减少总份额 从池子总份额中减去移除的份额
        // 这会影响后续的份额计算
        _lpAmount.totalLPShares -= _shareToRemove;
        // 2. 减少 ETH 储备 从池子 ETH 储备中减去要返还的数量
        // 确保池子状态与实际资产一致
        _lpAmount.ethLPReserve -= ethToRemove;
        // 3. 减少 MEME 储备
        _lpAmount.memeLPReserve -= memeToRemove;
        // 4. 减少用户份额
        _lpAmount.lpShares[msg.sender] -= _shareToRemove;
        // 资产返还
        // ETH 返还
        payable(msg.sender).transfer(ethToRemove);
        // MEME 代币返还
        myMemeToken.transfer(msg.sender, memeToRemove);
    }

      // 购买MEME
    function buyMeme() public payable tradeValidate(msg.value) {
        require(msg.value > 0, "Cannot buy 0 MEME");
        // AMM 价格计算逻辑
        // 1. 新的 ETH 储备计算计算交易后池子中的 ETH 总量 当前 ETH 储备 + 用户支付的 ETH
        uint newEthReserve = _lpAmount.ethLPReserve + msg.value;

        // 2. 新的 MEME 储备计算（核心算法）
        // 这是恒定乘积公式的应用:
        // 公式: 新MEME储备 = 当前MEME储备 × 当前ETH储备 ÷ 新ETH储备
        // 原理: 基于 x × y = k 的恒定乘积模型
        // 目的: 确保交易前后池子的乘积保持不变
        uint newMemeReserve = _lpAmount.memeLPReserve * _lpAmount.ethLPReserve / newEthReserve;

        // 3. 可购买的 MEME 数量计算 计算用户实际能获得的 MEME 数量 池子减少的 MEME 数量 = 用户获得的 MEME 数量
        uint memeToBuy = _lpAmount.memeLPReserve - newMemeReserve;

        // 交易税计算
        // 1. 税费计算
        // taxRate 是以千分比表示的税率（如 30 表示 3%）
        // 税费 = 购买数量 × 税率 ÷ 1000
        uint fee = memeToBuy * taxRate / 1000;
        // 2. 实际获得数量
        uint actualMemeToBuy = memeToBuy - fee;
        // 3. 验证实际获得数量
        require(actualMemeToBuy > 0, "Cannot buy 0 MEME");

        // 资产转移
        // 1. 向用户转移 MEME
        myMemeToken.transfer(msg.sender, actualMemeToBuy);
        // 2. 更新池子状态 更新池子中的 ETH 储备， 更新池子中的 MEME 储备
        _lpAmount.ethLPReserve = newEthReserve;
        _lpAmount.memeLPReserve = newMemeReserve;
        // 3. 税费转移（如果有） 只有当税费大于 0 时才转移，将税费转移到指定的税收地址
        if (fee > 0) {
            myMemeToken.transfer(taxAddress, fee);
        }
        // 交易记录
        userTradeRecords[msg.sender].push(block.timestamp);
    }

    // 查询流动性池 eth储备
        function lpEthReserve() public view returns (uint) {
        return _lpAmount.ethLPReserve;
    }

        // 卖MEME
    function sellMeme(uint _amount) public tradeValidate(_amount) {
        require(_amount > 0, "Amount must be greater than 0");
        // 转移 meme 到合约地址
        myMemeToken.transferFrom(msg.sender, address(this), _amount);
        // 增加池子的 meme储备
        uint newMemeReserve = _lpAmount.memeLPReserve + _amount;
        // 重新计算得出 池子的eth储备
        uint newEthReserve = _lpAmount.ethLPReserve * _lpAmount.memeLPReserve / newMemeReserve;
        // 计算卖家 eth得利
        uint ethToSend = _lpAmount.ethLPReserve - newEthReserve;
        uint fee = ethToSend * taxRate / 1000;
        // 扣税后最终 eth得利
        uint actualEthToSend = ethToSend - fee;
        payable(msg.sender).transfer(actualEthToSend);
        if (fee > 0) {
            payable(taxAddress).transfer(fee);
        }
        // 交易记录
        userTradeRecords[msg.sender].push(block.timestamp);
    }

    
    //以下是购买限制校验逻辑
    // constant: 编译时常量，节省 gas
    // 10 ether: 最大单次交易金额为 10 ETH
    // 目的: 防止大额交易对池子造成剧烈冲击
    uint constant MAX_TRADE_AMOUNT = 10 ether;

    // mapping: 地址到数组的映射
    // address: 用户地址作为键
    // uint256[]: 时间戳数组，记录用户的所有交易时间
    // private: 私有变量，只能从合约内部访问
    // 用途: 为每个用户维护交易历史记录
    mapping (address => uint256[] records) private userTradeRecords;

//  函数修饰符，用于在函数执行前进行验证， 接收交易金额参数
    modifier tradeValidate(uint _amount) {
        require(taxAddress != address(0), "taxAddress is not set");

         //获取上次交易时间
        uint lastTradeTime;
        uint recordSize = userTradeRecords[msg.sender].length;
        if (recordSize > 0) {
            lastTradeTime = userTradeRecords[msg.sender][recordSize - 1];
        }
        // 交易间隔验证（5秒限制）
        if (lastTradeTime > 0 && block.timestamp - lastTradeTime < 5 seconds) {
            revert("Trade too fast");
        }
        // 交易金额验证 确保单次交易金额不超过 10 ETH 防止大额交易对池子造成冲击
        require(_amount <= MAX_TRADE_AMOUNT, "Trade amount too large");
        // 24小时交易次数限制不能超过10次，从最近的交易往前一直查询，24小时内如果超过10次，进行限制，防止过度频繁交易
        uint recordIndex = recordSize;
        uint todayTradeTimes = 0;
        while (recordIndex >= 1) {
            // 最近的时间
            uint tradeTime = userTradeRecords[msg.sender][recordIndex - 1];
            if (tradeTime >= (block.timestamp - 24 hours)) {
                todayTradeTimes++;
                if (todayTradeTimes >= 10) {
                    revert("Trade too frequently");
                }
            } else {
                break;
            }
            recordIndex--;
         }
        _;
    }

    receive() external payable {
    }

}