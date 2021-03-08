/*

██████╗░██████╗░██╗███╗░░░███╗███████╗██████╗░░█████╗░░█████╗░
██╔══██╗██╔══██╗██║████╗░████║██╔════╝██╔══██╗██╔══██╗██╔══██╗
██████╔╝██████╔╝██║██╔████╔██║█████╗░░██║░░██║███████║██║░░██║
██╔═══╝░██╔══██╗██║██║╚██╔╝██║██╔══╝░░██║░░██║██╔══██║██║░░██║
██║░░░░░██║░░██║██║██║░╚═╝░██║███████╗██████╔╝██║░░██║╚█████╔╝
╚═╝░░░░░╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝░░╚═╝░╚════╝░

*/

// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity >=0.5.13;

import "@daostack/arc/contracts/libs/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "../utils/interfaces/IRewardDistributionRecipient.sol";


contract StakingRewards is IRewardDistributionRecipient, ReentrancyGuard {

    using SafeMath for uint256;
    using SafeERC20 for address;

    string  public name;

    address public rewardToken;
    address public stakingToken;

    bool    public initialized;

    modifier initializer() {
        require(!initialized, "StakingRewards: contract already initialized");
        initialized = true;
        _;
    }

    modifier protected() {
        require(initialized, "StakingRewards: contract not initialized");
        _;
    }

    /**
      * @dev                 Initialize contract.
      * @param _name         Farm name
      * @param _rewardToken  Reward token contract address
      * @param _stakingToken Staking token contract address
      * @param _initreward   Initial reward
      * @param _starttime    Start time
      */
    function initialize(
        string calldata _name,
        address         _rewardToken,
        address         _stakingToken,
        uint256         _initreward,
        uint256         _starttime,
        uint256         _duration,
        address         _avatar
    ) external initializer {
        require(_rewardToken  != address(0),                  "StakingRewards: rewardToken cannot be null");
        require(_stakingToken != address(0),                  "StakingRewards: stakingToken cannot be null");
        require(_initreward != 0,                             "StakingRewards: initreward cannot be null");
        require(_starttime != 0,                              "StakingRewards: starttime cannot be null");
        require(_duration != 0,                               "StakingRewards: duration cannot be null");

        name = _name;
        rewardToken  = _rewardToken;
        stakingToken = _stakingToken;
        initreward = _initreward;
        starttime = _starttime;
        DURATION = (_duration * 24 hours);

        rewardDistribution = _avatar;
    }

    uint256 public DURATION;

    uint256 public initreward;
    uint256 public starttime;
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function notifyRewardAmount(uint256 reward) external protected onlyRewardDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward.div(DURATION);
        } else {
            uint256 remaining = periodFinish.sub(block.timestamp);
            uint256 leftover = remaining.mul(rewardRate);
            rewardRate = reward.add(leftover).div(DURATION);
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = IERC20(rewardToken).balanceOf(address(this));
        require(rewardRate <= balance.div(DURATION), "StakingRewards: Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }

    // This function allows governance to take unsupported tokens out of the
    // contract, since this one exists longer than the other pools.
    // This is in an effort to make someone whole, should they seriously
    // mess up. There is no guarantee governance will vote to return these.
    // It also allows for removal of airdropped tokens.
    function rescueTokens(address _token, uint256 amount, address to)
    external
    protected
    onlyRewardDistribution
    {
        // cant take staked asset
        require(_token != stakingToken, "StakingRewards: stakingToken");
        // cant take reward asset
        require(_token != rewardToken, "StakingRewards: rewardToken");

        // transfer to
        _token.safeTransfer(to, amount);
    }

    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return Math.min(block.timestamp, periodFinish);
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
        rewardPerTokenStored.add(
            lastTimeRewardApplicable()
            .sub(lastUpdateTime)
            .mul(rewardRate)
            .mul(1e18)
            .div(_totalSupply)
        );
    }

    function earned(address account) public view returns (uint256) {
        return
        _balances[account]
        .mul(rewardPerToken().sub(userRewardPerTokenPaid[account]))
        .div(1e18)
        .add(rewards[account]);
    }

    function stake(uint256 amount) public nonReentrant updateReward(msg.sender) protected checkStart {
        require(amount > 0, "StakingRewards: cannot stake 0");
        _stake(amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) protected checkStart {
        require(amount > 0, "StakingRewards: Cannot withdraw 0");
        _withdraw(amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public nonReentrant updateReward(msg.sender) protected checkStart {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    modifier checkStart(){
        require(block.timestamp >= starttime,"StakingRewards: not start");
        _;
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function _stake(uint256 _amount) private {
        _totalSupply = _totalSupply.add(_amount);
        _balances[msg.sender] = _balances[msg.sender].add(_amount);
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function _withdraw(uint256 _amount) private {
        _totalSupply = _totalSupply.sub(_amount);
        _balances[msg.sender] = _balances[msg.sender].sub(_amount);
        stakingToken.safeTransfer(msg.sender, _amount);
    }

}
