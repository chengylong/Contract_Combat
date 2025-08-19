// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyStakeToken is ERC20{
    constructor() ERC20("MyStakeToken", "MSKT"){
        // 初始供应量可以在这里定义，或者留空以便之后通过 mint 函数铸造
         _mint(msg.sender, 1000_0000*1_000_000_000_000_000_000);
    }
}