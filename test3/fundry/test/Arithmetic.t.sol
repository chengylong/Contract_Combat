// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Arithmetic.sol";

contract ArithmeticTest is Test {
    Arithmetic public arithmetic;

    function setUp() public {
        arithmetic = new Arithmetic();
        emit log_string(unicode"\n=== 初始化完成 ===");
        emit log_named_uint(unicode"部署后初始result值", arithmetic.result());
    }

    // 测试加法功能
    function testAdd() public {
        emit log_string(unicode"\n=== 执行 testAdd ===");
        uint256 a = 100;
        uint256 b = 200;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.add(a, b);

        emit log_named_uint(unicode"返回结果", res);
        emit log_named_uint(unicode"状态变量result值", arithmetic.result());
        emit log_string(res == a + b ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(res, a + b);
    }

    // 测试减法功能（a >= b）
    function testSubtractNormal() public {
        emit log_string(unicode"\n=== 执行 testSubtractNormal ===");
        uint256 a = 300;
        uint256 b = 150;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.subtract(a, b);

        emit log_named_uint(unicode"返回结果", res);
        emit log_string(res == a - b ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(res, a - b);
    }

    // 测试减法功能（a < b，应返回0）
    function testSubtractUnderflow() public {
        emit log_string(unicode"\n=== 执行 testSubtractUnderflow ===");
        uint256 a = 50;
        uint256 b = 100;
        emit log_named_uint(unicode"输入 a", a);
        emit log_named_uint(unicode"输入 b", b);

        uint256 res = arithmetic.subtract(a, b);

        emit log_named_uint(unicode"返回结果", res);
        emit log_string(res == 0 ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(res, 0);
    }

    // 模糊测试：随机输入验证加法
    function testFuzz_Add(uint256 a, uint256 b) public {
        // 排除溢出的输入（a + b 不会溢出的条件）
    vm.assume(a <= type(uint256).max - b); 
    assertEq(arithmetic.add(a, b), a + b);
    }

    // 模糊测试：随机输入验证减法
    function testFuzz_Subtract(uint256 a, uint256 b) public {
        uint256 expected = a >= b ? a - b : 0;
        assertEq(arithmetic.subtract(a, b), expected);
    }
}
