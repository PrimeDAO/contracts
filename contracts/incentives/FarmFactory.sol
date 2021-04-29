/*

██████╗░██████╗░██╗███╗░░░███╗███████╗██████╗░░█████╗░░█████╗░
██╔══██╗██╔══██╗██║████╗░████║██╔════╝██╔══██╗██╔══██╗██╔══██╗
██████╔╝██████╔╝██║██╔████╔██║█████╗░░██║░░██║███████║██║░░██║
██╔═══╝░██╔══██╗██║██║╚██╔╝██║██╔══╝░░██║░░██║██╔══██║██║░░██║
██║░░░░░██║░░██║██║██║░╚═╝░██║███████╗██████╔╝██║░░██║╚█████╔╝
╚═╝░░░░░╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝░░╚═╝░╚════╝░

*/

// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.5.13;

import "@daostack/arc/contracts/controller/Avatar.sol";
import "@daostack/arc/contracts/controller/Controller.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../utils/CloneFactory.sol";
import "./StakingRewards.sol";

/**
 * @title primeDAO Yield Farming contracts factory
 * @dev   Enable primeDAO governance to start new yield farming programs.
 */
contract FarmFactory is CloneFactory {

	using SafeMath for uint256;

	string constant ERROR_INCREASE_REWARD            = "FarmFactory: increaseReward failed";
	string constant ERROR_RESCUE_TOKENS              = "FarmFactory: rescueTokens failed";
	string constant ERROR_CREATE_FARM                = "FarmFactory: create failed";


	Avatar public avatar;
	StakingRewards public parent;
	bool   public initialized;

	event FarmCreated(address indexed newFarm, address indexed pool);
	event TokenRescued(address farm, address token, address to);
	event RewardIncreased(address farm, uint amount);

	modifier initializer() {
		require(!initialized, 					"FarmFactory: contract already initialized");
		initialized = true;
		_;
	}

	modifier protected() {
		require(initialized,					"FarmFactory: contract not initialized");
		require(msg.sender == address(avatar),	"FarmFactory: protected operation");
		_;
	}

	/**
	  * @dev           Initialize proxy.
	  * @param _avatar The address of the Avatar controlling this contract.\
	  * @param _parent The address of the StakingRewards contract which will be a parent for all of the cloness.
	  */
	function initialize(Avatar _avatar, StakingRewards _parent) external initializer {
		require(_avatar != Avatar(0), 			"FarmFactory: avatar cannot be null");
		require(_parent != StakingRewards(0), 	"FarmFactory: parent cannot be null");
		avatar = _avatar;
		parent = _parent;
	}

	/**
  	* @dev             Update StakingReward contract which works as a base for clones.
  	* @param newParent The address of the new StakingReward basis.
  	*/
	function changeParent(StakingRewards newParent) public protected{
		parent = newParent;
	}

	/**
	  * @dev           			Create new farm.
	  * @param _name  			Farm name.
	  * @param _rewardToken  	Reward token address.
	  * @param _stakingToken 	staking token address.
	  * @param _initreward 		Initial reward.
	  * @param _starttime 		Program start time.
	  * @param _duration 		Program duration.
	  */
	function createFarm(
		string memory _name,
		address 	  _rewardToken,
		address 	  _stakingToken,
		uint256 	  _initreward,
		uint256 	  _starttime,
		uint256 	  _duration
	)
	public
	payable
	protected
	returns(address)
	{
		require( IERC20(_rewardToken).balanceOf(address(avatar)) >= _initreward,
			ERROR_CREATE_FARM);

		// create new farm
		address newFarm = createClone(address(parent));

		// transfer rewards to the new farm
		Controller(avatar.owner())
		.externalTokenTransfer(
			IERC20(_rewardToken),
			newFarm,
			_initreward,
			avatar
		);

		// initialize farm
		StakingRewards(newFarm).initialize(
			_name,
			_rewardToken,
			_stakingToken,
			_starttime,
			_duration,
			address(avatar)
		);

		emit FarmCreated(newFarm, _stakingToken);

		return newFarm;
	}

	function increaseReward(
		address _farm,
		uint    _amount
	)
	public
	protected
	{

		StakingRewards stakingRewards = StakingRewards(_farm);

		_increaseReward(stakingRewards, _amount);

		emit RewardIncreased(_farm, _amount);
	}

	/**
	  * @dev           			Rescues tokens from an existing farm.
	  * @param _stakingRewards  Existing Staking Rewards contract.
	  * @param _amount		 	Staking token address.
	  * @param _token 			Token address to be rescued.
	  * @param _to 				Rescue to an address.
	  */
	function rescueTokens(
		StakingRewards 	_stakingRewards,
		uint    		_amount,
		address 		_token,
		address 		_to
	)
	public
	protected
	{
		_rescueTokens(_stakingRewards, _amount, _token, _to);
		emit TokenRescued(address(_stakingRewards), _token, _to);
	}

	/* internal helpers functions */

	function _increaseReward(
		StakingRewards _farm,
		uint    	   _amount
	)
	internal
	{
		bool success;
		address _rewardToken = _farm.rewardToken();
		uint oldBalance = IERC20(_rewardToken).balanceOf(address(_farm));

		require( IERC20(_rewardToken).balanceOf(address(avatar)) >= _amount,
			ERROR_INCREASE_REWARD);

		Controller controller = Controller(avatar.owner());
		//transfer tokens to staking rewards contract
		controller.externalTokenTransfer(
			IERC20(_rewardToken),
			address(_farm),
			_amount,
			avatar
		);

		//call notify reward amount
		(success,) = controller.genericCall(
			address(_farm),
			abi.encodeWithSelector(
				_farm.notifyRewardAmount.selector,
				_amount.add(oldBalance)
			),
			avatar,
			0
		);
	}

	function _rescueTokens(
		StakingRewards 	_stakingRewards,
		uint    	 	_amount,
		address 		_token,
		address 		_to
	)
	internal
	{
		bool success;
		Controller controller = Controller(avatar.owner());
		require( IERC20(_token).balanceOf(address(_stakingRewards)) >= _amount,
			ERROR_RESCUE_TOKENS);

		(success,) = controller.genericCall(
			address(_stakingRewards),
			abi.encodeWithSelector(
				_stakingRewards.rescueTokens.selector,
				_token,
				_amount,
				_to
			),
			avatar,
			0
		);
		require(success, ERROR_RESCUE_TOKENS);
	}
}
