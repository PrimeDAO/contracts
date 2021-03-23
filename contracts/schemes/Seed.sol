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

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title primeDAO Seed contract
 */
contract Seed {
    using SafeMath for uint256;
    using SafeMath for uint16;

    // Locked parameters
    address public admin;
    uint    public cap;
    uint    public price;
    uint    public startTime;
    uint    public endTime;
    bool    public isWhitelisted;
    uint16  public vestingDuration;
    uint16  public vestingCliff;
    ERC20   public seedToken;
    ERC20   public fundingToken;

    uint256 constant internal SECONDS_PER_DAY = 86400;

    // Contract logic
    bool      public closed;
    bool      public paused;
    uint256   public totalLockCount;

    mapping (address => bool) public whitelisted;
    mapping (address => Lock) public tokenLocks; // locker to lock

    modifier onlyAdmin() {
        require(msg.sender == admin, "Seed: caller should be admin");
        _;
    }

    modifier protected() {
        require(closed != true, "Seed: should not be closed");
        require(paused != true, "Seed: should not be paused");
        _;
    }

    modifier checked() {
        require(isWhitelisted != true || whitelisted[msg.sender] == true, "Seed: sender has no rights");
        _;
    }

    constructor(
        address _admin,
        address _seedToken,
        address _fundingToken,
        uint    _cap,
        uint    _price,
        uint    _startTime,
        uint    _endTime,
        uint16  _vestingDuration,
        uint16  _vestingCliff,
        bool    _isWhitelisted
    )
    public
    {
        admin           = _admin;
        cap             = _cap;
        price           = _price;
        startTime       = _startTime;
        endTime         = _endTime;
        vestingDuration = _vestingDuration;
        vestingCliff    = _vestingCliff;
        isWhitelisted   = _isWhitelisted;
        seedToken       = ERC20(_seedToken);
        fundingToken    = ERC20(_fundingToken);
    }

    struct Lock {
        uint256 startTime;
        uint256 amount;
        uint16  vestingDuration;
        uint16  vestingCliff;
        uint16  daysClaimed;
        uint256 totalClaimed;
        address recipient;
    }

    function calculateClaim(address _locker) public view returns (uint16, uint256) {
        Lock storage tokenLock = tokenLocks[_locker];

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

    function claimLock(address _locker) public {
        uint16 daysVested;
        uint256 amountVested;
        (daysVested, amountVested) = calculateClaim(_locker);
        require(amountVested > 0, "amountVested is 0");

        Lock storage tokenLock = tokenLocks[_locker];
        tokenLock.daysClaimed = uint16(tokenLock.daysClaimed.add(daysVested));
        tokenLock.totalClaimed = uint256(tokenLock.totalClaimed.add(amountVested));

        require(seedToken.transfer(tokenLock.recipient, amountVested), "no tokens");
        // emit LockedTokensClaimed(tokenLock.recipient, amountVested);
    }

    function buy(uint256 _amount) public protected checked {
        require(fundingToken.transferFrom(msg.sender, address(this), _amount), "no tokens");

        // TODO: ADD fees
        uint _lockTokens = tokenLocks[msg.sender].amount;
        _addLock(msg.sender, block.timestamp, (_lockTokens.add(_amount)).mul(price));
    }

    // ADMIN ACTIONS

    function initialize() public onlyAdmin {
        require(seedToken.balanceOf(address(this)) == 0, "Seed: balance should be 0");
        require(seedToken.transferFrom(admin, address(this), cap), "Seed: should transfer seed tokens");
        closed = false;
    }

    function pause() public onlyAdmin protected {
        paused = true;
    }

    function unpause() public onlyAdmin {
        require(closed != true, "Seed: should not be closed");
        require(paused == true, "Seed: should be paused");

        paused = false;
    }

    function close() public onlyAdmin protected {
        // transfer all the tokens back to admin
        require(fundingToken.transfer(admin, fundingToken.balanceOf(address(this))), "Seed: should transfer tokens to admin");
        require(seedToken.transfer(admin, seedToken.balanceOf(address(this))), "Seed: should transfer tokens to admin");

        closed = true;
    }

    function whitelist(address buyer) public onlyAdmin protected {
        require(isWhitelisted == true, "Seed: module is not whitelisted");

        whitelisted[buyer] = true;
    }

    function unwhitelist(address buyer) public onlyAdmin protected {
        require(isWhitelisted == true, "Seed: module is not whitelisted");

        whitelisted[buyer] = false;
    }

    function withdraw() public onlyAdmin protected {
        fundingToken.transfer(msg.sender, fundingToken.balanceOf(msg.sender));
    }

    // INTERNAL FUNCTIONS

    function _currentTime() internal view returns(uint256) {
        return block.timestamp;
    }

    function _addLock(
        address _recipient,
        uint256 _startTime,
        uint256 _amount
    )
        internal
    {
  
        uint256 amountVestedPerDay = _amount.div(vestingDuration);
        require(amountVestedPerDay > 0, "amountVestedPerDay > 0");

        Lock memory lock = Lock({
            startTime: _startTime == 0 ? _currentTime() : _startTime,
            amount: _amount,
            vestingDuration: vestingDuration,
            vestingCliff: vestingCliff,
            daysClaimed: 0,
            totalClaimed: 0,
            recipient: _recipient
        });
        tokenLocks[_recipient] = lock;
        // emit GrantAdded(_recipient, totalVestingCount);
        totalLockCount++;
    }
}