// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";



contract MyMemeToken is ERC20 {

    address public owner;

    constructor() ERC20("MyMemeToken", "MMT") {
        owner = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}