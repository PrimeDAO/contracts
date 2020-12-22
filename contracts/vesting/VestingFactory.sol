pragma solidity >=0.5.13;

import "./TokenVesting.sol";

contract VestingFactory {

    event VestingCreated(address vestingContractAddress);

    function create(address owner, address beneficiary, uint256 start, uint256 cliffDuration, uint256 duration, bool revocable) public returns(address) {
        require(owner != address(0), "VestingFactory: owner is the zero address");
        TokenVesting newVestingContract = new TokenVesting(beneficiary, start, cliffDuration, duration, revocable);
        newVestingContract.transferOwnership(owner);
        emit VestingCreated(address(newVestingContract));
        return address(newVestingContract);
    }
}