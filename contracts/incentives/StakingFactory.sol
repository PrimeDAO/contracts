pragma solidity >=0.5.13;

import "./StakingRewards.sol";

contract VestingFactory {

    event StakingCreated(address stakingRewardsAddress);

    function create() public returns(address) {
        // require(owner != address(0), "VestingFactory: owner is the zero address");
        StakingRewards newContract = new StakingRewards();
        newContract.transferOwnership(msg.sender);
        emit StakingCreated(address(newContract));
        return address(newContract);
    }
}