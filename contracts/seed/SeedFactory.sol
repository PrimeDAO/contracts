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

import "./Seed.sol";

/**
 * @title primeDAO Seed Factory
 * @dev   Enable primeDAO governance to start new seeds.
 */
contract SeedFactory {
    address public avatar;
    address[] whitelist;

	event SeedCreated(address indexed newSeed);

    constructor(address _avatar) public {
        avatar = _avatar;
	}
	// TODO: add change avatar
	function deploySeed(
		address _admin,
		address _seedToken,
		address _fundingToken,
		uint 	_cap,
		uint 	_price,
		uint 	_startTime,
		uint 	_endTime,
		uint16 	_vestingDuration,
		uint16 	_vestingCliff,
		bool 	_isWhitelisted
	)
	public
	returns(address)
	{

		Seed _newSeed = new Seed(
				_admin,
				_seedToken,
				_fundingToken,
				_cap,
				_price,
				_startTime,
				_endTime,
				_vestingDuration,
				_vestingCliff,
				_isWhitelisted
		);

		// _newSeed.transferOwnership(address(avatar));
		if (msg.sender == avatar){
			whitelist.push(address(_newSeed));
		}

		emit SeedCreated(address(_newSeed));

		return address(_newSeed);
	}
}
