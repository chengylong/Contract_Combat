// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title 优化后的算术运算合约
contract ArithmeticOptimized {
    /// @notice 加法运算（直接返回结果，无状态存储）
    function add(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }

    /// @notice 减法运算（三元运算符简化逻辑）
    function subtract(uint256 a, uint256 b) external pure returns (uint256) {
        return a >= b ? a - b : 0;
    }
}
