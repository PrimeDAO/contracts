pragma solidity 0.5.13;

import "@daostack/arc/contracts/controller/Avatar.sol";
import "@daostack/arc/contracts/controller/Controller.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../incentives/StakingRewards.sol";

contract FarmFactory {

    Avatar public avatar;
    bool   public initialized;

	event FarmCreated(address newFarm);

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

	function initialize(Avatar _avatar) external initializer {
        require(_avatar != Avatar(0), 			"FarmFactory: avatar cannot be null");
		avatar = _avatar;
	}

	function createFarm(
        address _rewardToken,
        address _stakingToken,
        uint256 _initreward,
        uint256 _starttime,
        uint256 _duration
	)
	public
	payable
	protected
	returns(address)
	{
		// create new farm
		address newFarm = _create();

		// transfer rewards to the new farm
		Controller(
        avatar.owner())
        .externalTokenTransfer(IERC20(_rewardToken), newFarm, _initreward, avatar);

        // initialize farm
        StakingRewards(newFarm).initialize(_rewardToken, _stakingToken, _initreward, _starttime, _duration);

        return newFarm;
	}

	function rescueTokens(
		StakingRewards _stakingRewards,
		uint    _amount,
		address _token,
		address _to
	)
	public
	protected
	{
		_stakingRewards.rescueTokens(_token, _amount, _to);
	}

    /* internal helpers functions */

	function _create() internal returns(address) {
        StakingRewards _newFarm = new StakingRewards();
        _newFarm.transferOwnership(address(avatar));

        emit FarmCreated(address(_newFarm));
        return address(_newFarm);
    }
}
