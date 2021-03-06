// File: contracts/IRewardDistributionRecipient.sol

pragma solidity >=0.5.13;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract IRewardDistributionRecipient is Ownable {
    address rewardDistribution;

    function notifyRewardAmount(uint256 reward) external;

    modifier onlyRewardDistribution() {
        require(_msgSender() == rewardDistribution, "Caller is not reward distribution");
        _;
    }

//    TODO: do we really need this, it isn't used anywhere
    function setRewardDistribution(address _rewardDistribution)
        external
        onlyOwner
    {
        rewardDistribution = _rewardDistribution;
    }
}
