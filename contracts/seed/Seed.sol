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

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title primeDAO Seed contract
 */
contract Seed {
    using SafeMath for uint256;
    using SafeMath for uint16;

    // Locked parameters
    address public dao;
    address public admin;
    uint    public successMinimum;
    uint    public price;
    uint    public startTime;
    uint    public endTime;
    bool    public isWhitelisted;
    uint16  public vestingDuration;
    uint16  public vestingCliff;
    ERC20   public seedToken;
    ERC20   public fundingToken;
    uint8   public fee;

    uint256 constant internal PCT_BASE        = 10 ** 18;  // // 0% = 0; 1% = 10 ** 16; 100% = 10 ** 18
    uint256 constant internal SECONDS_PER_DAY = 86400;

    // Contract logic
    bool      public closed;
    bool      public paused;
    uint256   public totalLockCount;
    bool      public initialized;
    bool      public minimumReached;

    mapping (address => bool) public whitelisted;
    mapping (address => Lock) public tokenLocks; // locker to lock
    mapping (address => uint256) public fees;

    event LockAdded(address indexed recipient, uint256 locked);
    event TokensClaimed(address indexed recipient, uint256 amountVested);

    modifier initializer() {
        require(!initialized, "Seed: contract already initialized");
        initialized = true;
        _;
    }

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

    modifier checkMinimumReached() {
        require(minimumReached == true, "Seed: minimum funding amount not met");
        _;
    }

    modifier beforeMinimumReached() {
        require(minimumReached == false, "Seed: minimum already met");
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

    function initialize(
            address _dao,
            address _admin,
            address _seedToken,
            address _fundingToken,
            uint    _successMinimum,
            uint    _price,
            uint    _startTime,
            uint    _endTime,
            uint16  _vestingDuration,
            uint16  _vestingCliff,
            bool    _isWhitelisted,
            uint8   _fee
    ) public initializer {
        dao             = _dao;
        admin           = _admin;
        successMinimum  = _successMinimum;
        price           = _price;
        startTime       = _startTime;
        endTime         = _endTime;
        vestingDuration = _vestingDuration;
        vestingCliff    = _vestingCliff;
        isWhitelisted   = _isWhitelisted;
        seedToken       = ERC20(_seedToken);
        fundingToken    = ERC20(_fundingToken);
        fee             = _fee;
        closed = false;
        minimumReached = false;
    }

    function claimLock(address _locker) public checkMinimumReached {
        uint16 daysVested;
        uint256 amountVested;
        (daysVested, amountVested) = _calculateClaim(_locker);
        require(amountVested > 0, "Seed: amountVested is 0");

        Lock storage tokenLock = tokenLocks[_locker];
        tokenLock.daysClaimed = uint16(tokenLock.daysClaimed.add(daysVested));
        tokenLock.totalClaimed = uint256(tokenLock.totalClaimed.add(amountVested));

        require(seedToken.transfer(dao, fees[_locker]), "Seed: cannot transfer fee to dao");
        require(seedToken.transfer(tokenLock.recipient, amountVested), "Seed: no tokens");
        emit TokensClaimed(tokenLock.recipient, amountVested);
    }

    function buy(uint256 _amount) public protected checked {
        require(fundingToken.transferFrom(msg.sender, address(this), _amount), "Seed: no tokens");
        // map buyins

        if (fundingToken.balanceOf(address(this)) >= successMinimum) {
            minimumReached = true;
        }

        uint feeAmount = _amount.mul(fee).div(100);
        fees[msg.sender] = feeAmount;
        uint _lockTokens = tokenLocks[msg.sender].amount;
        _addLock(msg.sender, block.timestamp, (_lockTokens.add(_amount)).mul(price).div(PCT_BASE));
    }

    function buyBack() public protected checked beforeMinimumReached {
        //
    }

    // ADMIN ACTIONS
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
        require(
            fundingToken.transfer(admin, fundingToken.balanceOf(address(this))),
            "Seed: should transfer funding tokens to admin"
        );
        require(
            seedToken.transfer(admin, seedToken.balanceOf(address(this))),
            "Seed: should transfer seed tokens to admin"
        );

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
        fundingToken.transfer(msg.sender, fundingToken.balanceOf(address(this)));
    }

    // GETTER FUNCTIONS
    function calculateClaim(address _locker) public view returns(uint16, uint256) {
        return _calculateClaim(_locker);
    }

    function checkWhitelisted(address _buyer) public view returns(bool) {
        return whitelisted[_buyer];
    }

    function getStartTime(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].startTime;
    }

    function getAmount(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].amount;
    }

    function getVestingDuration(address _locker) public view returns(uint16) {
        return tokenLocks[_locker].vestingDuration;
    }

    function getVestingCliff(address _locker) public view returns(uint16) {
        return tokenLocks[_locker].vestingCliff;
    }

    function getDaysClaimed(address _locker) public view returns(uint16) {
        return tokenLocks[_locker].daysClaimed;
    }

    function getTotalClaimed(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].totalClaimed;
    }

    function getRecipient(address _locker) public view returns(address) {
        return tokenLocks[_locker].recipient;
    }

    function getFee(address _locker) public view returns(uint256) {
        return fees[_locker];
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
        require(amountVestedPerDay > 0, "Seed: amountVestedPerDay > 0");

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
        emit LockAdded(_recipient, _amount);
        totalLockCount++;
    }

    function _calculateClaim(address _locker) private view returns (uint16, uint256) {
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
}
