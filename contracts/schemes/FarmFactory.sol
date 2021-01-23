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
import "../incentives/StakingRewards.sol";

/**
 * @title primeDAO Yield Farming contracts factory
 * @dev   Enable primeDAO governance to start new yield farming programs.
 */
contract FarmFactory {
	Avatar public avatar;
	bool   public initialized;

	event FarmCreated(address newFarm);
	event TokenRescued(address farm, address token, address to);

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
	  * @param _avatar The address of the Avatar controlling this contract.
	  */
	function initialize(Avatar _avatar) external initializer {
		require(_avatar != Avatar(0), 			"FarmFactory: avatar cannot be null");
		avatar = _avatar;
	}

	/**
	  * @dev           			Create new farm.
	  * @param _rewardToken  	Reward token address.
	  * @param _stakingToken 	staking token address.
	  * @param _initreward 		Initial reward.
	  * @param _starttime 		Program start time.
	  * @param _duration 		Program duration.
	  */
	function createFarm(
		address _rewardToken,
		address _stakingToken,
		uint256 _initreward,
		uint256 _starttime,
		uint256 _duration//,
		// address _avatarAddress
	)
		public
		payable
		protected
		returns(address)
		{
		// create new farm
		address newFarm = _create();

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
			_rewardToken,
			_stakingToken,
			_initreward,
			_starttime,
			_duration//,
			// _avatarAddress
		);

		return newFarm;
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

	function _create() internal returns(address) {
		StakingRewards _newFarm = new StakingRewards();
		_newFarm.transferOwnership(address(avatar));

		emit FarmCreated(address(_newFarm));
		return address(_newFarm);
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
	}
}
