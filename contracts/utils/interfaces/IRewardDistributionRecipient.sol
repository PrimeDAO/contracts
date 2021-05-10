// File: contracts/IRewardDistributionRecipient.sol

pragma solidity 0.5.13;


contract IRewardDistributionRecipient {
    address public rewardDistribution;

    function notifyRewardAmount(uint256 reward) external;

    modifier onlyRewardDistribution() {
        require(msg.sender == rewardDistribution, "Caller is not reward distribution");
        _;
    }

    function setRewardDistribution(address _rewardDistribution)
    external
    onlyRewardDistribution
    {
        rewardDistribution = _rewardDistribution;
    }

}
