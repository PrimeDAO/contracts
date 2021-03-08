/*

██████╗░██████╗░██╗███╗░░░███╗███████╗██████╗░░█████╗░░█████╗░
██╔══██╗██╔══██╗██║████╗░████║██╔════╝██╔══██╗██╔══██╗██╔══██╗
██████╔╝██████╔╝██║██╔████╔██║█████╗░░██║░░██║███████║██║░░██║
██╔═══╝░██╔══██╗██║██║╚██╔╝██║██╔══╝░░██║░░██║██╔══██║██║░░██║
██║░░░░░██║░░██║██║██║░╚═╝░██║███████╗██████╔╝██║░░██║╚█████╔╝
╚═╝░░░░░╚═╝░░╚═╝╚═╝╚═╝░░░░░╚═╝╚══════╝╚═════╝░╚═╝░░╚═╝░╚════╝░

*/

// SPDX-License-Identifier: GPL-3.0-or-later

// https://gist.github.com/rstormsf/7cfb0c6b7a835c0c67b4a394b4fd9383

pragma solidity 0.5.13;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title primeDAO Seed contract
 */
contract Seed {
    using SafeMath for uint256;
    using SafeMath for uint16;

    struct Lock {
        uint256 startTime;
        uint256 amount;
        uint16  vestingDuration;
        uint16  vestingCliff;
        uint16  daysClaimed;
        uint256 totalClaimed;
        address recipient;
    }

    ERC20 public seedToken;
    ERC20 public fundingToken;

    mapping (uint256 => Grant) public tokenLocks;
    // mapping (address => uint[]) private activeGrants;


    function calculateClaim(uint256 _lockId) public view returns (uint16, uint256) {
        Lock storage tokenLock = tokenLock[_lockId];

        // For grants created with a future start date, that hasn't been reached, return 0, 0
        if (_currentTime() < tokenLock.startTime) {
            return (0, 0);
        }

        // Check cliff was reached
        uint elapsedTime = _currentTime().sub(tokenLock.startTime);
        uint elapsedDays = elapsedTime.div(SECONDS_PER_DAY);
        
        if (elapsedDays < tokenLock.vestingCliff) {
            return (uint16(elapsedDays), 0);
        }

        // If over vesting duration, all tokens vested
        if (elapsedDays >= tokenLock.vestingDuration) {
            uint256 remainingGrant = tokenLock.amount.sub(tokenLock.totalClaimed);
            return (tokenLock.vestingDuration, remainingGrant);
        } else {
            uint16 daysVested = uint16(elapsedDays.sub(tokenLock.daysClaimed));
            uint256 amountVestedPerDay = tokenLock.amount.div(uint256(tokenLock.vestingDuration));
            uint256 amountVested = uint256(daysVested.mul(amountVestedPerDay));
            return (daysVested, amountVested);
        }
    }

    function claimTokens(uint256 _lockId) external {
        uint16 daysVested;
        uint256 amountVested;
        (daysVested, amountVested) = calculateClaim(_lockId);
        require(amountVested > 0, "amountVested is 0");

        Lock storage tokenLock = tokenLocks[_lock];
        tokenLock.daysClaimed = uint16(tokenLock.daysClaimed.add(daysVested));
        tokenLock.totalClaimed = uint256(tokenLock.totalClaimed.add(amountVested));
        
        require(token.seedToken(tokenLock.recipient, amountVested), "no tokens");
        // emit GrantTokensClaimed(tokenLock.recipient, amountVested);
    }

    // INTERNAL FUNCTIONS

    function _currentTime() internal view returns(uint256) {
        return block.timestamp;
    }

    function _addLock(
        address _recipient,
        uint256 _startTime,
        uint256 _amount,
        uint16 _vestingDurationInDays,
        uint16 _vestingCliffInDays    
    ) 
        internal    
    {
        // require(_vestingCliffInDays <= 10*365, "more than 10 years");
        // require(_vestingDurationInDays <= 25*365, "more than 25 years");
        // require(_vestingDurationInDays >= _vestingCliffInDays, "Duration < Cliff");
        
        uint256 amountVestedPerDay = _amount.div(_vestingDurationInDays);
        require(amountVestedPerDay > 0, "amountVestedPerDay > 0");

        // Transfer the grant tokens under the control of the vesting contract
        // require(token.transferFrom(v12MultiSig, address(this), _amount), "transfer failed");

        Lock memory lock = Lock({
            startTime: _startTime == 0 ? _currentTime() : _startTime,
            amount: _amount,
            vestingDuration: _vestingDurationInDays,
            vestingCliff: _vestingCliffInDays,
            daysClaimed: 0,
            totalClaimed: 0,
            recipient: _recipient
        });
        tokenLocks[totalVestingCount] = lock;
        // activeGrants[_recipient].push(totalVestingCount);
        // emit GrantAdded(_recipient, totalVestingCount);
        // totalVestingCount++;
    }

}