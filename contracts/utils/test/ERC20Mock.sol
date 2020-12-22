pragma solidity ^0.5.13;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract ERC20Mock is ERC20 {
    string public name;
    string public symbol;
    uint8  public decimals;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) public {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _mint(msg.sender, uint256(20000000000000000000000));
    }
}