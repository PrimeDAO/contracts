/*

██████╗░██████╗░██╗███╗░░░███╗███████╗██████╗░░█████╗░░█████╗░
██╔══██╗██╔══██╗██║████╗░████║██╔════╝██╔══██╗██╔══██╗██╔══██╗
██████╔╝██████╔╝██║██╔████╔██║█████╗░░██║░░██║███████║██║░░██║
██╔═══╝░██╔══██╗██║██║╚██╔╝██║██╔══╝░░██║░░██║██╔══██║██║░░██║
██║░░░░░██║░░██║██║██║░╚═╝░██║███████╗██████╔╝██║░░██║╚█████╔╝
╚═╝░░░░░╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝░░╚═╝░╚════╝░

*/

// SPDX-License-Identifier: GPL-3.0-or-later
/* solhint-disable space-after-comma */
pragma solidity 0.5.13;

import "@daostack/arc/contracts/controller/Avatar.sol";
import "@daostack/arc/contracts/controller/Controller.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Seed.sol";
import "../utils/CloneFactory.sol";


/**
 * @title primeDAO Seed Factory
 * @dev   Enable primeDAO governance to create new Seed contracts.
 */
contract SeedFactory is CloneFactory {

    Avatar    public avatar;
    Seed      public parent;
    bool      public initialized;

    event SeedCreated(address indexed newSeed, address indexed beneficiary);

    modifier initializer() {
        require(!initialized, "SeedFactory: contract already initialized");
        initialized = true;
        _;
    }

    modifier protected() {
        require(initialized,                    "SeedFactory: contract not initialized");
        require(msg.sender == address(avatar),	"SeedFactory: protected operation");
        _;
    }

    /**
      * @dev           Initialize proxy.
      * @param _avatar The address of the Avatar controlling this contract.
      * @param _parent The address of the Seed contract which will be a parent for all of the clones.
      */
    function initialize(Avatar _avatar, Seed _parent) external initializer {
        require(_avatar != Avatar(0), "SeedFactory: avatar cannot be null");
        require(_parent != Seed(0),   "SeedFactory: parent cannot be null");
        avatar = _avatar;
        parent = _parent;
    }

    /**
    * @dev             Update Seed contract which works as a base for clones.
    * @param newParent The address of the new Seed basis.
    */
    function changeParent(Seed newParent) public protected {
        parent = newParent;
    }

    /**
    * @dev             Update Avatar.
    * @param _newAvatar The address of the new Avatar.
    */
    function changeAvatar(Avatar _newAvatar) public protected {
        avatar = _newAvatar;
    }

    /**
      * @dev                          Deploys Seed contract.
      * @param _admin                 The address of the admin of this contract.
      * @param _seedToken             The address of the token being distributed.
      * @param _fundingToken          The address of the token being exchanged for seed token.
      * @param _successMinimumAndCap  Array of the minimum distribution threshold and
                                      the highest possible amount to be raised in wei.
      * @param _startTime             Distribution start time in unix timecode.
      * @param _endTime               Distribution end time in unix timecode.
      * @param _vestingDuration       Vesting period duration.
      * @param _vestingCliff          Cliff duration.
      * @param _isWhitelisted         Set to true if only whitelisted adresses are allowed to participate.
      * @param _fee                   Success fee as %
    */
    function deploySeed(
        address       _admin,
        address       _seedToken,
        address       _fundingToken,
        uint[] memory _successMinimumAndCap,
        uint  	      _price,
        uint 	      _startTime,
        uint 	      _endTime,
        uint16 	      _vestingDuration,
        uint16 	      _vestingCliff,
        bool 	      _isWhitelisted,
        uint8         _fee
    )
    public
    protected
    returns(address)
    {
        // deploy clone
        address _newSeed = createClone(address(parent));

        // initialize
        Seed(_newSeed).initialize(
            msg.sender,
            _admin,
            _seedToken,
            _fundingToken,
            _successMinimumAndCap,
            _price,
            _startTime,
            _endTime,
            _vestingDuration,
            _vestingCliff,
            _isWhitelisted,
            _fee
        );

        // fund
        require(
            IERC20(_seedToken).transferFrom(_admin, address(_newSeed), _successMinimumAndCap[1]),
            "SeedFactory: cannot transfer seed tokens"
        );

        emit SeedCreated(address(_newSeed), msg.sender);

        return address(_newSeed);
    }
}
