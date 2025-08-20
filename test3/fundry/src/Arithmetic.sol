// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 基础算术运算合约（未优化版本）
contract Arithmetic {
    // 存储计算结果的状态变量
    uint256 public result;

    /// @notice 加法运算：a + b
    function add(uint256 a, uint256 b) external returns (uint256) {
        result = a + b;
        return result;
    }

    /// @notice 减法运算：a - b（若为负则返回0）
    function subtract(uint256 a, uint256 b) external returns (uint256) {
        if (a >= b) {
            result = a - b;
        } else {
            result = 0;
        }
        return result;
    }
}
