/*
   ____            __   __        __   _
  / __/__ __ ___  / /_ / /  ___  / /_ (_)__ __
 _\ \ / // // _ \/ __// _ \/ -_)/ __// / \ \ /
/___/ \_, //_//_/\__//_//_/\__/ \__//_/ /_\_\
     /___/
* Synthetix: PrimeIncentives.sol
*
* Docs: https://docs.synthetix.io/
*
*
* MIT License
* ===========
*
* Copyright (c) 2020 Synthetix
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*/

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/math/Math.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


pragma solidity >=0.5.13;


contract StakingRewards is Ownable, ReentrancyGuard {

    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public rewardToken;
    IERC20 public stakingToken;
    bool   public initialized;

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
      * @dev           Initialize contract.
      * @param _rewardToken  The address
      * @param _stakingToken The address
      * @param _initreward Initial reward
      * @param _starttime Start time
      */
    function initialize(
      address _rewardToken,
      address _stakingToken,
      uint256 _initreward,
      uint256 _starttime,
      uint256 _duration
    ) external initializer {
        require(_rewardToken  != address(0),                  "StakingRewards: rewardToken cannot be null");
        require(_stakingToken != address(0),                  "StakingRewards: stakingToken cannot be null");
        require(_initreward != 0,                             "StakingRewards: initreward cannot be null");
        require(_starttime != 0,                              "StakingRewards: starttime cannot be null");
        require(_duration != 0,                               "StakingRewards: duration cannot be null");

        rewardToken  = IERC20(_rewardToken);
        stakingToken = IERC20(_stakingToken);
        initreward = _initreward;
        starttime = _starttime;
        DURATION = (_duration * 24 hours);

        require(_initreward == rewardToken.balanceOf(address(this)),   "StakingRewards: wrong reward amount supplied");

        _notifyRewardAmount(_initreward);
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

    /* stake visibility is public as overriding LPTokenWrapper's stake() function */
    /* added nonReentrant modifier as calling _stake(): calls token contract */
     function stake(uint256 amount) public nonReentrant updateReward(msg.sender) protected checkStart {
        require(amount > 0, "StakingRewards: cannot stake 0");
        _stake(amount);
        emit Staked(msg.sender, amount);
    }

    /* added nonReentrant modifier as calling _withdraw(): calls token contract */
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) protected checkStart {
        require(amount > 0, "StakingRewards: Cannot withdraw 0");
        _withdraw(amount);
        emit Withdrawn(msg.sender, amount);
    }

    /* added nonReentrant modifier as calling withdraw() and getReward(): these call token contract */
    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /* added nonReentrant modifier as calling token contract */
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

    // This function allows governance to take unsupported tokens out of the
    // contract, since this one exists longer than the other pools.
    // This is in an effort to make someone whole, should they seriously
    // mess up. There is no guarantee governance will vote to return these.
    // It also allows for removal of airdropped tokens.
    function rescueTokens(IERC20 _token, uint256 amount, address to)
        external
        protected
    {
        // only gov
        require(msg.sender == owner(), "StakingRewards: !governance");
        // cant take staked asset
        require(_token != stakingToken, "StakingRewards: stakingToken");
        // cant take reward asset
        require(_token != rewardToken, "StakingRewards: rewardToken");

        // transfer to
        _token.safeTransfer(to, amount);
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

    function _notifyRewardAmount(uint256 reward) internal updateReward(address(0)) {
        rewardRate = reward.div(DURATION);
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp.add(DURATION);
        emit RewardAdded(reward);
    }
}
