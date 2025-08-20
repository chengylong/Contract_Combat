// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;

    function setUp() public {
        counter = new Counter();
        counter.setNumber(0);
        // 中文需用unicode前缀
        emit log_string(unicode"=== 初始化完成 ===");
        emit log_named_uint(unicode"初始值", counter.number());
    }

    function test_Increment() public {
        emit log_string(unicode"\n=== 执行 test_Increment ===");
        emit log_named_uint(unicode"increment 前的值", counter.number());
        
        counter.increment();
        
        emit log_named_uint(unicode"increment 后的值", counter.number());
        emit log_string(counter.number() == 1 ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(counter.number(), 1);
    }

    function testFuzz_SetNumber(uint256 x) public {
        emit log_string(unicode"\n=== 执行 testFuzz_SetNumber ===");
        emit log_named_uint(unicode"输入的随机值 x", x);
        
        counter.setNumber(x);
        
        emit log_named_uint(unicode"设置后的值", counter.number());
        emit log_string(counter.number() == x ? unicode"验证结果: 成功" : unicode"验证结果: 失败");
        assertEq(counter.number(), x);
    }
}
