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
/* solhint-disable max-states-count */
pragma solidity 0.5.13;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title primebeneSeed contract
 * @dev   Smart contract for seed phases of liquid launch.
 */
contract Seed {
    using SafeMath for uint256;
    using SafeMath for uint16;
    using SafeMath for uint8;

    // Locked parameters
    address public beneficiary;
    address public admin;
    uint    public successMinimum;
    uint    public cap;
    uint    public price;
    uint    public startTime;
    uint    public endTime;
    bool    public isWhitelisted;
    uint16  public vestingDuration;
    uint16  public vestingCliff;
    IERC20  public seedToken;
    IERC20  public fundingToken;
    uint8   public fee;

    bytes32 public metadata;

    uint256 constant internal PCT_BASE        = 10 ** 18;  // // 0% = 0; 1% = 10 ** 16; 100% = 10 ** 18
    uint32  public constant PPM               = 1000000;   // parts per million
    uint256 public constant PPM100            = 100000000; // ppm * 100
    uint256 constant internal SECONDS_PER_DAY = 86400;

    // Contract logic
    bool      public closed;
    bool      public paused;
    uint256   public totalLockCount;
    bool      public initialized;
    bool      public minimumReached;

    mapping (address => bool)    public whitelisted;
    mapping (address => Lock)    public tokenLocks; // locker to lock

    event LockAdded(address indexed recipient, uint256 locked);
    event TokensClaimed(address indexed recipient, uint256 amountVested);
    event FundingReclaimed(address indexed recipient, uint256 amountReclaimed);
    event MetadataUpdated(bytes32 indexed metadata);

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
        _;
    }

    struct Lock {
        uint256 startTime;
        uint256 amount;
        uint16  vestingDuration;
        uint16  vestingCliff;
        uint16  daysClaimed;
        uint256 totalClaimed;
        uint256 fundingAmount;
        uint256 fee;
    }

    /**
      * @dev                          Initialize Seed.
      * @param _admin                 The address of the admin of this contract. Funds contract
                                      and has permissions to whitelist users, pause and close contract.
      * @param _tokens                Array containing two params:
                                        - The address of the token being distributed.
      *                                 - The address of the token being exchanged for seed token.
      * @param _successMinimumAndCap  Array containing two params:
                                        - the minimum distribution threshold
                                        - the highest possible amount to be raised in wei.
      * @param _price                 The price in wei of fundingTokens when exchanged for seedTokens.
      * @param _startTime             Distribution start time in unix timecode.
      * @param _endTime               Distribution end time in unix timecode.
      * @param _vestingDuration       Vesting period duration in days.
      * @param _vestingCliff          Cliff duration in days.
      * @param _isWhitelisted         Set to true if only whitelisted adresses are allowed to participate.
      * @param _fee                   Success fee expressed in Wei as a % (e.g. 2 = 2% fee)
    */
    function initialize(
            address _beneficiary,
            address _admin,
            address[] memory _tokens,
            uint[] memory    _successMinimumAndCap,
            uint    _price,
            uint    _startTime,
            uint    _endTime,
            uint16  _vestingDuration,
            uint16  _vestingCliff,
            bool    _isWhitelisted,
            uint8   _fee
    ) public initializer {
        beneficiary     = _beneficiary;
        admin           = _admin;
        successMinimum  = _successMinimumAndCap[0];
        cap             = _successMinimumAndCap[1];
        price           = _price;
        startTime       = _startTime;
        endTime         = _endTime;
        vestingDuration = _vestingDuration;
        vestingCliff    = _vestingCliff;
        isWhitelisted   = _isWhitelisted;
        seedToken       = IERC20(_tokens[0]);
        fundingToken    = IERC20(_tokens[1]);
        fee             = _fee;
        closed          = false;
        minimumReached  = false;
    }

    /**
      * @dev                     Buy seed tokens.
      * @param _amount           The amount of tokens to buy.
    */
    function buy(uint256 _amount) public protected checked {
        require((fundingToken.balanceOf(address(this)).add(_amount)) <= cap, "Seed: amount exceeds contract sale cap");
        require(fundingToken.transferFrom(msg.sender, address(this), _amount), "Seed: no tokens");

        if (fundingToken.balanceOf(address(this)) >= successMinimum) {
            minimumReached = true;
        }

        uint feeAmount = (_amount.mul(uint(PPM))).mul(fee).div(PPM100);

        uint _lockTokens = tokenLocks[msg.sender].amount;
        _addLock(msg.sender, (_lockTokens.add((_amount).mul(price).div(PCT_BASE))), _amount, feeAmount);
    }

    /**
      * @dev                     Claim locked tokens.
      * @param _locker           The address of the locker.
    */
    function claimLock(address _locker) public checkMinimumReached {
        uint16 daysVested;
        uint256 amountVested;
        (daysVested, amountVested) = _calculateClaim(_locker);
        require(amountVested > 0, "Seed: amountVested is 0");

        Lock storage tokenLock = tokenLocks[_locker];
        tokenLock.daysClaimed = uint16(tokenLock.daysClaimed.add(daysVested));
        tokenLock.totalClaimed = uint256(tokenLock.totalClaimed.add(amountVested));

        require(seedToken.transfer(beneficiary, tokenLock.fee), "Seed: cannot transfer to beneficiary");
        require(seedToken.transfer(_locker, amountVested), "Seed: no tokens");
        emit TokensClaimed(_locker, amountVested);
    }

    /**
      * @dev         Returns funding tokens to user.
    */
    function buyBack() public protected checked beforeMinimumReached {
        Lock storage tokenLock = tokenLocks[msg.sender];
        uint amount = tokenLock.fundingAmount;
        tokenLock.amount = 0;
        tokenLock.fee = 0;
        tokenLock.fundingAmount = 0;
        require(
            fundingToken.transfer(msg.sender, amount),
            "Seed: cannot return funding tokens to msg.sender"
        );
        emit FundingReclaimed(msg.sender, amount);
    }

    // ADMIN ACTIONS

    /**
      * @dev                     Pause distribution.
    */
    function pause() public onlyAdmin protected {
        paused = true;
    }

    /**
      * @dev                     Unpause distribution.
    */
    function unpause() public onlyAdmin {
        require(closed != true, "Seed: should not be closed");
        require(paused == true, "Seed: should be paused");

        paused = false;
    }

    /**
      * @dev                     Close distribution.
    */
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

    /**
      * @dev                     Add address to whitelist.
    */
    function whitelist(address _buyer) public onlyAdmin protected {
        require(isWhitelisted == true, "Seed: module is not whitelisted");

        whitelisted[_buyer] = true;
    }

    /**
      * @dev                     Add multiple addresses to whitelist.
    */
    function whitelistBatch(address[] memory _buyers) public onlyAdmin protected {
        require(isWhitelisted == true, "Seed: module is not whitelisted");
        for (uint i=0; i < _buyers.length; i++) {
            whitelisted[_buyers[i]] = true;
        }
    }

    /**
      * @dev                     Remove address from whitelist.
    */
    function unwhitelist(address buyer) public onlyAdmin protected {
        require(isWhitelisted == true, "Seed: module is not whitelisted");

        whitelisted[buyer] = false;
    }

    /**
      * @dev                     Withdraw funds from the contract
    */
    function withdraw() public onlyAdmin checkMinimumReached protected {
        fundingToken.transfer(msg.sender, fundingToken.balanceOf(address(this)));
    }

    /**
      * @dev                     Updates metadata.
    */
    function updateMetadata(bytes32 _metadata) public {
        require(
            initialized != true || msg.sender == admin,
            "Seed: contract should not be initialized or caller should be admin"
        );
        metadata = _metadata;
        emit MetadataUpdated(_metadata);
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

    function getFee(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].fee;
    }

    // INTERNAL FUNCTIONS
    function _currentTime() internal view returns(uint256) {
        return block.timestamp;
    }

    function _addLock(
        address _recipient,
        uint256 _amount,
        uint256 _fundingAmount,
        uint256 _fee
    )
        internal
    {

        uint256 amountVestedPerDay = _amount.div(vestingDuration);
        require(amountVestedPerDay > 0, "Seed: amountVestedPerDay > 0");

        Lock memory lock = Lock({
            startTime: _currentTime(),
            amount: _amount,
            vestingDuration: vestingDuration,
            vestingCliff: vestingCliff,
            daysClaimed: 0,
            totalClaimed: 0,
            fundingAmount: _fundingAmount,
            fee: _fee
        });
        tokenLocks[_recipient] = lock;
        emit LockAdded(_recipient, _amount);
        totalLockCount++;
    }

    function _calculateClaim(address _locker) private view returns (uint16, uint256) {
        Lock storage tokenLock = tokenLocks[_locker];

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
