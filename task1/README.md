一个简单的Meme币，一共两个合约：MyMemeToken 和 LiquidityPool，分别表示Meme币和流动性池。

MyMemeToken.sol 是 Meme 币的实现，它继承了ERC20代币标准。

流动性池实现一个简单的 AMM 算法，通过计算 x * y = k 来保证池子中的代币数量和价格是固定的。可以添加和移除流动性，也可以进行兑换。

有交易税，交易税发送到一个专门的地址。