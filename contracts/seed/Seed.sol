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
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public seedRemainder;
    uint256 public allocatedSeed;
    uint256 public price;
    uint256 public startTime;
    uint256 public endTime;
    bool    public permissionedSeed;
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
    bool      public maximumReached;   

    mapping (address => bool)    public whitelisted;
    mapping (address => Lock)    public tokenLocks; // locker to lock

    event LockAdded(address indexed recipient, uint256 locked);
    event TokensClaimed(address indexed recipient, uint256 amountVested);
    event FundingReclaimed(address indexed recipient, uint256 amountReclaimed);
    event MetadataUpdated(bytes32 indexed metadata);

    struct Lock { 
        uint256 seedAmount;
        uint16  daysClaimed;
        uint256 totalClaimed;
        uint256 fundingAmount;
        uint256 fee;
    }

    modifier initializer() {
        require(!initialized, "Seed: contract already initialized");
        initialized = true;
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Seed: caller should be admin");
        _;
    }

    modifier isActive() {
        require(closed != true, "Seed: should not be closed");
        require(paused != true, "Seed: should not be paused");
        _;
    }

    modifier allowedToBuy() {
        require(permissionedSeed != true || whitelisted[msg.sender] == true, "Seed: sender has no rights");
        require(endTime >= block.timestamp ,"Seed: the distribution is already finished");
        _;
    }

    modifier allowedToClaim() {
        require(minimumReached == true, "Seed: minimum funding amount not met");
        require(endTime <= block.timestamp  || maximumReached == true,"Seed: the distribution has not yet finished");
        _;
    }

    modifier allowedToRetrieve() {
        require(minimumReached == false, "Seed: minimum already met");
        require(paused != true, "Seed: should not be paused");
        _;
    }

    modifier allowedToWithdraw() {
        require(minimumReached == true, "Seed: minimum funding amount not met");
        require(paused != true, "Seed: should not be paused");
        _;
    }

    /**
      * @dev                          Initialize Seed.
      * @param _beneficiary           The address that recieves fees.
      * @param _admin                 The address of the admin of this contract. Funds contract
                                      and has permissions to whitelist users, pause and close contract.
      * @param _tokens                Array containing two params:
                                        - The address of the token being distributed.
      *                                 - The address of the token being exchanged for seed token.
      * @param _softAndHardCap         Array containing two params:
                                        - the minimum distribution threshold
                                        - the highest possible amount to be raised in wei.
      * @param _price                 The price in wei of fundingTokens when exchanged for seedTokens.
      * @param _startTime             Distribution start time in unix timecode.
      * @param _endTime               Distribution end time in unix timecode.
      * @param _vestingDuration       Vesting period duration in days.
      * @param _vestingCliff          Cliff duration in days.
      * @param _permissionedSeed         Set to true if only whitelisted adresses are allowed to participate.
      * @param _fee                   Success fee expressed as a % (e.g. 2 = 2% fee)
    */
    function initialize(
        address _beneficiary,
        address _admin,
        address[] memory _tokens,
        uint256[] memory _softAndHardCap,
        uint256 _price,
        uint256 _startTime,
        uint256 _endTime,
        uint16  _vestingDuration,
        uint16  _vestingCliff,
        bool    _permissionedSeed,
        uint8   _fee
    ) public initializer {
        beneficiary     = _beneficiary;
        admin           = _admin;
        softCap         = _softAndHardCap[0];
        hardCap         = _softAndHardCap[1];
        price           = _price;
        startTime       = _startTime;
        endTime         = _endTime;
        vestingDuration = _vestingDuration;
        vestingCliff    = _vestingCliff;
        permissionedSeed   = _permissionedSeed;
        seedToken       = IERC20(_tokens[0]);
        fundingToken    = IERC20(_tokens[1]);
        fee             = _fee;
        closed          = false;
        minimumReached  = false;
        maximumReached  = false;
        seedRemainder   = IERC20(_tokens[0]).balanceOf(address(this));
        allocatedSeed   = seedRemainder;
    }

    /**
      * @dev                     Buy and lock seed tokens.
      * @param _seedAmount       The amount of seed tokens to buy.
    */
    function buy(uint256 _seedAmount) public isActive allowedToBuy {
        //  fundingAmount is an amount of fundingTokens required to buy _seedAmount of SeedTokens
        uint256 fundingAmount = (_seedAmount.mul(price)).div(PCT_BASE);

        // Funding Token balance of this contract;
        uint256 fundingBalance = fundingToken.balanceOf(address(this));

        //  feeAmount is an amount of fee we are going to get in seedTokens
        uint256 feeAmount = (_seedAmount.mul(uint256(PPM))).mul(fee).div(PPM100);

        // total fundingAmount should not be greater than the hardCap
        require( fundingBalance.
                  add(fundingAmount).
                  add((feeAmount.mul(price)).div(PCT_BASE)) <= hardCap,
            "Seed: amount exceeds contract sale hardCap");

        // the amount of seed tokens still to be distributed
        seedRemainder = (seedRemainder.sub(_seedAmount)).sub(feeAmount);

        // require( seedToken.balanceOf(address(this)) >= seedRemainder,
        //     "Seed: seed distribution exceeded");

        // Here we are sending amount of tokens to pay for lock and fee
        // FundingTokensSent = fundingAmount + fundingFee
        require(fundingToken.transferFrom(msg.sender, address(this), fundingAmount.
            add(feeAmount.mul(price).div(PCT_BASE))), "Seed: no tokens");

        if (fundingToken.balanceOf(address(this)) >= softCap) {
            minimumReached = true;
        } else if (fundingToken.balanceOf(address(this)) >= hardCap) {
            maximumReached = true;            
        }

        _addLock(
            msg.sender,
            (tokenLocks[msg.sender].seedAmount.add(_seedAmount)),       // Previous Seed Amount + new seed amount
            (tokenLocks[msg.sender].fundingAmount.add(fundingAmount)),  // Previous Funding Amount + new funding amount
             tokenLocks[msg.sender].daysClaimed,
             tokenLocks[msg.sender].totalClaimed,
            (tokenLocks[msg.sender].fee.add(feeAmount))                 // Previous Fee + new fee
            );
    }

    /**
      * @dev                     Claim locked tokens.
      * @param _locker           The address of the locker.
    */
    function claimLock(address _locker) public allowedToClaim {
        uint16 daysVested;
        uint256 amountVested;
        (daysVested, amountVested) = _calculateClaim(_locker);
        require(amountVested > 0, "Seed: amountVested is 0");

        Lock memory tokenLock = tokenLocks[_locker];
        tokenLock.daysClaimed  = uint16(tokenLock.daysClaimed.add(daysVested));
        tokenLock.totalClaimed = uint256(tokenLock.totalClaimed.add(amountVested));
        tokenLocks[_locker] = tokenLock;

        require(seedToken.transfer(beneficiary, tokenLock.fee), "Seed: cannot transfer to beneficiary");
        require(seedToken.transfer(_locker, amountVested), "Seed: no tokens");
        emit TokensClaimed(_locker, amountVested);
    }

    /**
      * @dev         Returns funding tokens to user.
    */
    function retrieveFundingTokens() public allowedToRetrieve {
        require(tokenLocks[msg.sender].fundingAmount > 0, "Seed: zero funding amount");
        Lock memory tokenLock = tokenLocks[msg.sender];
        uint256 amount = tokenLock.fundingAmount;
        uint256 fundingFeeAmount = (amount.mul(uint256(PPM))).mul(fee).div(PPM100);
        seedRemainder = seedRemainder.add(tokenLock.seedAmount).add(tokenLock.fee);
        tokenLock.seedAmount = 0;
        tokenLock.fee = 0;
        tokenLock.fundingAmount = 0;
        tokenLocks[msg.sender] = tokenLock;
        require(
            fundingToken.transfer(msg.sender, amount.add(fundingFeeAmount)),
            "Seed: cannot return funding tokens to msg.sender"
        );
        emit FundingReclaimed(msg.sender, amount);
    }

    // ADMIN ACTIONS

    /**
      * @dev                     Pause distribution.
    */
    function pause() public onlyAdmin isActive {
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
    function close() public onlyAdmin isActive {
        // transfer seed tokens back to admin
        require(
            seedToken.transfer(admin, seedToken.balanceOf(address(this))),
            "Seed: should transfer seed tokens to admin"
        );

        closed = true;
    }

    /**
      * @dev                     Add address to whitelist.
    */
    function whitelist(address _buyer) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");

        whitelisted[_buyer] = true;
    }

    /**
      * @dev                     Add multiple addresses to whitelist.
    */
    function whitelistBatch(address[] memory _buyers) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");
        for (uint256 i=0; i < _buyers.length; i++) {
            whitelisted[_buyers[i]] = true;
        }
    }

    /**
      * @dev                     Remove address from whitelist.
    */
    function unwhitelist(address buyer) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");

        whitelisted[buyer] = false;
    }

    /**
      * @dev                     Withdraw funds from the contract
    */
    function withdraw() public onlyAdmin allowedToWithdraw {
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

    function getStartTime() public view returns(uint256) {
        return startTime;  
    }

    function getSeedAmount(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].seedAmount;
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
        uint256 _seedAmount,
        uint256 _fundingAmount,
        uint16  _daysClaimed,
        uint256 _totalClaimed,
        uint256 _fee
    )
    internal
    {

        uint256 amountVestedPerDay = _seedAmount.div(vestingDuration);
        require(amountVestedPerDay > 0, "Seed: amountVestedPerDay > 0");

        Lock memory lock = Lock({
            seedAmount: _seedAmount,
            daysClaimed: _daysClaimed,
            totalClaimed: _totalClaimed,
            fundingAmount: _fundingAmount,
            fee: _fee
            });
        tokenLocks[_recipient] = lock;
        emit LockAdded(_recipient, _seedAmount);
        totalLockCount++;
    }

    function _calculateClaim(address _locker) private view returns (uint16, uint256) {
        Lock memory tokenLock = tokenLocks[_locker];

        // Check cliff was reached
        uint256 elapsedTime = _currentTime().sub(startTime);
        uint256 elapsedDays = elapsedTime.div(SECONDS_PER_DAY);

        if (elapsedDays < vestingCliff) {
            return (uint16(elapsedDays), 0);
        }

        // If over vesting duration, all tokens vested
        if (elapsedDays >= vestingDuration) {
            uint256 remainingGrant = tokenLock.seedAmount.sub(tokenLock.totalClaimed);
            return (vestingDuration, remainingGrant);
        } else {
            uint16 daysVested = uint16(elapsedDays.sub(tokenLock.daysClaimed));
            uint256 amountVestedPerDay = tokenLock.seedAmount.div(uint256(vestingDuration));
            uint256 amountVested = uint256(daysVested.mul(amountVestedPerDay));
            return (daysVested, amountVested);
        }
    }
}
