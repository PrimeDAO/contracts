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
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Seed.sol";
import "../utils/CloneFactory.sol";

/**
 * @title primeDAO Seed Factory
 * @dev   Enable primeDAO governance to create new Seed contracts.
 */
contract SeedFactory is CloneFactory {
    using SafeMath for uint256;

    Avatar public avatar;
    Seed public masterCopy;
    bool public initialized;

    event SeedCreated(address indexed newSeed, address indexed beneficiary);

    modifier initializer() {
        require(!initialized, "SeedFactory: contract already initialized");
        initialized = true;
        _;
    }

    modifier protected() {
        require(initialized, "SeedFactory: contract not initialized");
        require(
            msg.sender == address(avatar),
            "SeedFactory: protected operation"
        );
        _;
    }

    /**
     * @dev               Initialize proxy.
     * @param _avatar     The address of the Avatar controlling this contract.
     * @param _masterCopy The address of the Seed contract which will be a masterCopy for all of the clones.
     */
    function initialize(Avatar _avatar, Seed _masterCopy) external initializer {
        require(_avatar     != Avatar(0), "SeedFactory: avatar cannot be null");
        require(_masterCopy != Seed(0),   "SeedFactory: masterCopy cannot be null");
        avatar = _avatar;
        masterCopy = _masterCopy;
    }

    /**
     * @dev             Update Seed contract which works as a base for clones.
     * @param newMasterCopy The address of the new Seed basis.
     */
    function changeMasterCopy(Seed newMasterCopy) public protected {
        masterCopy = newMasterCopy;
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
      * @param _admin                 The address of the admin of this contract. Funds contract
                                      and has permissions to whitelist users, pause and close contract.
      * @param _tokens                Array containing two params:
                                        - The address of the seed token being distributed.
      *                                 - The address of the funding token being exchanged for seed token.
      * @param _softHardThresholds     Array containing two params:
                                        - the minimum funding token collection threshold in wei denomination.
                                        - the highest possible funding token amount to be raised in wei denomination.
      * @param _price                 The price in wei of fundingTokens when exchanged for seedTokens.
      * @param _startTime             Distribution start time in unix timecode.
      * @param _endTime               Distribution end time in unix timecode.
      * @param _vestingDuration       Vesting period duration in days.
      * @param _vestingCliff          Cliff duration in days.
      * @param _isWhitelisted         Set to true if only whitelisted adresses are allowed to participate.
      * @param _fee                   Success fee expressed in Wei as a % (e.g. 2 = 2% fee)
      * @param _metadata              Seed contract metadata, that is IPFS URI
    */
    function deploySeed(
        address _admin,
        address[] memory _tokens,
        uint256[] memory _softHardThresholds,
        uint256 _price,
        uint256 _startTime,
        uint256 _endTime,
        uint32 _vestingDuration,
        uint32 _vestingCliff,
        bool _isWhitelisted,
        uint8 _fee,
        bytes32 _metadata
    ) public protected returns (address) {
        // deploy clone
        address _newSeed = createClone(address(masterCopy));

        Seed(_newSeed).updateMetadata(_metadata);

        // initialize
        Seed(_newSeed).initialize(
            msg.sender,
            _admin,
            _tokens,
            _softHardThresholds,
            _price,
            _startTime,
            _endTime,
            _vestingDuration,
            _vestingCliff,
            _isWhitelisted,
            _fee
        );

        emit SeedCreated(address(_newSeed), msg.sender);

        return address(_newSeed);
    }
}
