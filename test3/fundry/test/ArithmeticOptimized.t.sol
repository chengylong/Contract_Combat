// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ArithmeticOptimized.sol";

contract ArithmeticOptimizedTest is Test {
    ArithmeticOptimized public arithmetic;

    function setUp() public {
        arithmetic = new ArithmeticOptimized();
        emit log_string(unicode"\n=== 优化版合约初始化完成 ===");
    }

    function testAdd() public {
        emit log_string(unicode"\n=== 执行 testAdd（优化版） ===");
        uint256 a = 100;
        uint256 b = 200;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.add(a, b);

        emit log_named_uint(unicode"返回结果", res);
        emit log_string(res == a + b ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(res, a + b);
    }

    function testSubtractNormal() public {
        emit log_string(unicode"\n=== 执行 testSubtractNormal（优化版） ===");
        uint256 a = 300;
        uint256 b = 150;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.subtract(a, b);
        emit log_named_uint(unicode"返回结果", res);
        assertEq(res, a - b);
    }

    function testSubtractUnderflow() public {
        emit log_string(unicode"\n=== 执行 testSubtractUnderflow（优化版） ===");
        uint256 a = 50;
        uint256 b = 100;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.subtract(a, b);
        emit log_named_uint(unicode"返回结果", res);
        assertEq(res, 0);
    }

    function testFuzz_Add(uint256 a, uint256 b) public {
         vm.assume(a <= type(uint256).max - b); // 排除会导致溢出的输入
        assertEq(arithmetic.add(a, b), a + b);
    }

    function testFuzz_Subtract(uint256 a, uint256 b) public {
        uint256 expected = a >= b ? a - b : 0;
        assertEq(arithmetic.subtract(a, b), expected);
    }
}
