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
    address[] public whitelist;

    event SeedCreated(address indexed newSeed);

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
      * @param _parent The address of the Seed contract which will be a parent for all of the cloness.
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
        parent.transferOwnership(address(avatar));
    }

    // TODO: add change avatar
    function deploySeed(
    address _admin,
    address _seedToken,
    address _fundingToken,
    uint 	_successMinimum,
    uint 	_price,
    uint 	_startTime,
    uint 	_endTime,
    uint16 	_vestingDuration,
    uint16 	_vestingCliff,
    bool 	_isWhitelisted,
    uint8 _fee
    ) public returns(address) {
        // deploy
        Seed _newSeed = new Seed();

        // initialize
        _newSeed.initialize(
            _admin,
            _seedToken,
            _fundingToken,
            _successMinimum,
            _price,
            _startTime,
            _endTime,
            _vestingDuration,
            _vestingCliff,
            _isWhitelisted,
            _fee
        );

        // _newSeed.transferOwnership(_admin); // check re design with this 

        if (msg.sender == address(avatar)) {
            whitelist.push(address(_newSeed));
        }

        emit SeedCreated(address(_newSeed));

        return address(_newSeed);
    }
}
