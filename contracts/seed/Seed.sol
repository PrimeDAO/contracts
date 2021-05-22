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
    using SafeMath for uint32;
    using SafeMath for uint8;

    // Locked parameters
    address public beneficiary;
    address public admin;
    uint256 public softCap;
    uint256 public hardCap;
    uint256 public seedAmountRequired;    // Amount of seed required for distribution
    uint256 public seedForFeeRequired;    // Amount of seed required for fee
    uint256 public price;
    uint256 public startTime;
    uint256 public endTime;
    bool    public permissionedSeed;
    uint32  public vestingDuration;
    uint32  public vestingCliff;
    IERC20  public seedToken;
    IERC20  public fundingToken;
    uint8   public fee;

    bytes32 public metadata;           // IPFS Hash

    uint256 constant internal PCT_BASE        = 10 ** 18;  // // 0% = 0; 1% = 10 ** 16; 100% = 10 ** 18
    uint32  public constant PPM               = 1000000;   // parts per million
    uint256 public constant PPM100            = 100000000; // ppm * 100
    uint256 constant internal SECONDS_PER_DAY = 86400;

    // Contract logic
    bool    public closed;
    bool    public paused;
    bool    public isFunded;               // distribution can only start when required seed tokens have been funded
    bool    public initialized;
    bool    public minimumReached;
    bool    public maximumReached;
    uint256 public totalLockCount;         // Total locks that have been created. Each user can have only one lock.
    uint256 public seedRemainder;          // Amount of seed tokens remaining to be distributed
    uint256 public seedClaimed;            // Amount of seed token claimed by the user.
    uint256 public feeSeedRemainder;       // Amount of seed tokens remaining for the fee
    uint256 public feeSeedClaimed;         // Amount of seed tokens claimed as fee
    uint256 public fundingCollected;       // Amount of funding tokens collected by the seed contract.
    uint256 public fundingWithdrawn;       // Amount of funding token withdrawn from the seed contract. 

    mapping (address => bool)    public whitelisted;
    mapping (address => Lock)    public tokenLocks; // locker to lock

    event SeedsPurchased(address indexed recipient, uint256 locked);
    event TokensClaimed(address indexed recipient,uint256 amount,address indexed beneficiary,uint256 feeAmount);
    event FundingReclaimed(address indexed recipient, uint256 amountReclaimed);
    event MetadataUpdated(bytes32 indexed metadata);

    struct Lock { 
        uint256 seedAmount;
        uint32  secondsClaimed;
        uint256 totalClaimed;
        uint256 fundingAmount;
        uint256 fee;
        uint256 feeClaimed;
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
        require(maximumReached == false, "Seed: maximum funding reached" );
        require(permissionedSeed != true || whitelisted[msg.sender] == true, "Seed: sender has no rights");
        require(endTime >= block.timestamp && startTime <= block.timestamp,
            "Seed: only allowed during distribution period");
        _;
    }

    modifier allowedToClaim() {
        require(minimumReached == true, "Seed: minimum funding amount not met");
        require(endTime <= block.timestamp  || maximumReached == true,"Seed: the distribution has not yet finished");
        _;
    }

    modifier allowedToRetrieve() {
        require(paused != true, "Seed: should not be paused");
        require(startTime <= block.timestamp, "Seed: distribution haven't started");
        require(minimumReached == false, "Seed: minimum already met");
        _;
    }

    modifier allowedToWithdraw() {
        require(paused != true, "Seed: should not be paused");
        require(closed != true, "Seed: should not be closed");
        require(minimumReached == true, "Seed: minimum funding amount not met");
        _;
    }

    /**
      * @dev                          Initialize Seed.
      * @param _beneficiary           The address that recieves fees.
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
      * @param _vestingDuration       Vesting period duration in seconds.
      * @param _vestingCliff          Cliff duration in seconds.
      * @param _permissionedSeed      Set to true if only whitelisted adresses are allowed to participate.
      * @param _fee                   Success fee expressed as a % (e.g. 2 = 2% fee)
    */
    function initialize(
        address _beneficiary,
        address _admin,
        address[] memory _tokens,
        uint256[] memory _softHardThresholds,
        uint256 _price,
        uint256 _startTime,
        uint256 _endTime,
        uint32  _vestingDuration,
        uint32  _vestingCliff,
        bool    _permissionedSeed,
        uint8   _fee
    ) public initializer {
        beneficiary       = _beneficiary;
        admin             = _admin;
        softCap           = _softHardThresholds[0];
        hardCap           = _softHardThresholds[1];
        price             = _price;
        startTime         = _startTime;
        endTime           = _endTime;
        vestingDuration   = _vestingDuration;
        vestingCliff      = _vestingCliff;
        permissionedSeed  = _permissionedSeed;
        seedToken         = IERC20(_tokens[0]);
        fundingToken      = IERC20(_tokens[1]);
        fee               = _fee;
        closed            = false;
        minimumReached    = false;
        maximumReached    = false;

        seedAmountRequired = (hardCap.div(_price)).mul(10**18);
        seedForFeeRequired = seedAmountRequired.mul(_fee).div(100);
        seedRemainder     = seedAmountRequired;
        feeSeedRemainder  = seedForFeeRequired;
    }

    /**
      * @dev                     Buy and lock seed tokens.
      * @param _fundingAmount    The amount of funding tokens to contribute.
    */
    function buy(uint256 _fundingAmount) public isActive allowedToBuy returns(uint256, uint256) {
        if(!isFunded) {
            require(seedToken.balanceOf(address(this)) >= seedAmountRequired.add(seedForFeeRequired),
                "Seed: sufficient seeds not provided");
            isFunded = true;
        }
        // fundingAmount is an amount of fundingTokens required to buy _seedAmount of SeedTokens
        uint256 seedAmount = (_fundingAmount.mul(PCT_BASE)).div(price);

        // Funding Token balance of this contract;
        uint256 fundingBalance = fundingCollected;

        // feeAmount is an amount of fee we are going to get in seedTokens
        uint256 feeAmount = seedAmount.mul(fee).div(100);

        // total fundingAmount should not be greater than the hardCap
        require( fundingBalance.
                  add(_fundingAmount) <= hardCap,
            "Seed: amount exceeds contract sale hardCap");

        require( seedRemainder >= seedAmount && feeSeedRemainder >= feeAmount,
            "Seed: seed distribution would be exceeded");

        fundingCollected = fundingBalance.add(_fundingAmount);

        // the amount of seed tokens still to be distributed
        seedRemainder    = seedRemainder.sub(seedAmount);
        feeSeedRemainder = feeSeedRemainder.sub(feeAmount);

        // Here we are sending amount of tokens to pay for lock and fee
        require(fundingToken.transferFrom(msg.sender, address(this), _fundingAmount), "Seed: no tokens");

        if (fundingCollected >= softCap) {
            minimumReached = true;
        }
        if (fundingCollected >= hardCap) {
            maximumReached = true;            
        }

        _addLock(
            msg.sender,
            (tokenLocks[msg.sender].seedAmount.add(seedAmount)),         // Previous Seed Amount + new seed amount
            (tokenLocks[msg.sender].fundingAmount.add(_fundingAmount)),  // Previous Funding Amount + new funding amount
             tokenLocks[msg.sender].secondsClaimed,
             tokenLocks[msg.sender].totalClaimed,
            (tokenLocks[msg.sender].fee.add(feeAmount)),                  // Previous Fee + new fee
             tokenLocks[msg.sender].feeClaimed
            );
        
        // buyer, seed token purchased in this transaction (not the total amount of seed purchased)
        emit SeedsPurchased(msg.sender, seedAmount);

        return (seedAmount, feeAmount);
    }

    /**
      * @dev                     Claim locked tokens.
      * @param _locker           Address of lock to calculate seconds and amount claimable
      * @param _claimAmount      The amount of seed token a users wants to claim.
    */
    function claim(address _locker, uint256 _claimAmount) public allowedToClaim returns(uint256, uint256) {
        uint32 secondsVested;
        uint256 amountClaimable;

        (secondsVested, amountClaimable) = _calculateClaim(_locker);
        require( amountClaimable >= _claimAmount, "Seed: request is greater than claimable amount");
        uint256 feeAmountOnClaim = _claimAmount.mul(fee).div(100);

        Lock memory tokenLock = tokenLocks[_locker];

        tokenLock.totalClaimed    = uint256(tokenLock.totalClaimed.add(_claimAmount));
        tokenLock.feeClaimed      = tokenLock.feeClaimed.add(feeAmountOnClaim);
        tokenLocks[_locker] = tokenLock;
        
        seedClaimed    = seedClaimed.add(_claimAmount);
        feeSeedClaimed = feeSeedClaimed.add(feeAmountOnClaim);
        require(seedToken.transfer(beneficiary, feeAmountOnClaim), "Seed: cannot transfer to beneficiary");
        require(seedToken.transfer(_locker, _claimAmount), "Seed: no tokens");

        emit TokensClaimed(_locker, _claimAmount, beneficiary, feeAmountOnClaim);
        
        // amount of seed rewarded , fee on the distributed reward collected from admin
        return (_claimAmount, feeAmountOnClaim);
    }

    /**
      * @dev         Returns funding tokens to user.
    */
    function retrieveFundingTokens() public allowedToRetrieve returns(uint256) {
        require(tokenLocks[msg.sender].fundingAmount > 0, "Seed: zero funding amount");
        Lock memory tokenLock = tokenLocks[msg.sender];
        uint256 fundingAmount = tokenLock.fundingAmount;
        seedRemainder    = seedRemainder.add(tokenLock.seedAmount);
        feeSeedRemainder = feeSeedRemainder.add(tokenLock.fee);
        tokenLock.seedAmount    = 0;
        tokenLock.fee           = 0;
        tokenLock.fundingAmount = 0;
        tokenLocks[msg.sender]  = tokenLock;
        fundingCollected = fundingCollected.sub(fundingAmount);
        require(
            fundingToken.transfer(msg.sender, fundingAmount),
            "Seed: cannot return funding tokens to msg.sender"
        );
        emit FundingReclaimed(msg.sender, fundingAmount);

        return fundingAmount;
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
        if(minimumReached){
            // remaining seeds - seedRemainder + feeSeedRemainder
            uint256 seedToTransfer = seedRemainder.add(feeSeedRemainder);
            require(
                seedToken.transfer(admin, seedToTransfer),
                "Seed: should transfer seed tokens to admin"
            );
            paused = false;
        } else {
            require(
                seedToken.transfer(admin, seedAmountRequired.add(seedForFeeRequired)),
                "Seed: should transfer seed tokens to admin"
            );
            closed = true;
            paused = false;
        }
    }

    /**
      * @dev                     Add address to whitelist.
      * @param _buyer            Address which needs to be whitelisted
    */
    function whitelist(address _buyer) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");

        whitelisted[_buyer] = true;
    }

    /**
      * @dev                     Add multiple addresses to whitelist.
      * @param _buyers           Array of addresses to whitelist addresses in batch
    */
    function whitelistBatch(address[] memory _buyers) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");
        for (uint256 i=0; i < _buyers.length; i++) {
            whitelisted[_buyers[i]] = true;
        }
    }

    /**
      * @dev                     Remove address from whitelist.
      * @param buyer             Address which needs to be unwhitelisted
    */
    function unwhitelist(address buyer) public onlyAdmin isActive {
        require(permissionedSeed == true, "Seed: module is not whitelisted");

        whitelisted[buyer] = false;
    }

    /**
      * @dev                     Withdraw funds from the contract
    */
    function withdraw() public onlyAdmin allowedToWithdraw {
        uint pendingFundingBalance = fundingCollected.sub(fundingWithdrawn);
        fundingWithdrawn = fundingCollected;
        fundingToken.transfer(msg.sender, pendingFundingBalance);
    }

    /**
      * @dev                     Updates metadata.
      * @param _metadata         Seed contract metadata, that is IPFS Hash
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
    /**
      * @dev                     Calculates the maximum claim
      * @param _locker           Address of lock to find the maximum claim
    */
    function calculateClaim(address _locker) public view returns(uint32, uint256) {
        // EXP - Second argument - ( seed amount bought by User ).sub( seed amount user have claimed )
        return _calculateClaim(_locker);
    }

    /**
      * @dev                     check whitelist status of a buyer
      * @param _buyer            address of buyer to check status
    */
    function checkWhitelisted(address _buyer) public view returns(bool) {
        return whitelisted[_buyer];
    }

    /**
      * @dev                      get start time of seed distribution
    */
    function getStartTime() public view returns(uint256) {
        return startTime;  
    }

    /**
      * @dev                      get the total seed amount bought
      * @param _locker            Address of lock to find the total seed amount bought
    */
    function getSeedAmount(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].seedAmount;
    }

    // /**
    //   * @dev                      get the total seconds claimed
    //   * @param _locker            Address of lock to find the total seconds claimed
    // */
    // function getSecondsClaimed(address _locker) public view returns(uint32) {
    //     return tokenLocks[_locker].secondsClaimed;
    // }

    /**
      * @dev                      get the total seed amount claimed
      * @param _locker            Address of lock to find the total seed amount claimed
    */
    function getTotalClaimed(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].totalClaimed;
    }

    /**
      * @dev                      get the fee for a locker in seed token
      * @param _locker            Address of lock to find the fee
    */
    function getFee(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].fee;
    }

    /**
      * @dev                      get the fee claimed for a locker in seed token
      * @param _locker            Address of lock to find the fee
    */
    function getFeeClaimed(address _locker) public view returns(uint256) {
        return tokenLocks[_locker].feeClaimed;
    }

    // INTERNAL FUNCTIONS
    /**
      * @dev                      get current time or block.timestamp
    */
    function _currentTime() internal view returns(uint256) {
        return block.timestamp;
    }

    /**
      * @dev                      add/update lock
      * @param _recipient         Address of lock recipient
      * @param _seedAmount        seed amount of the lock
      * @param _fundingAmount     funding amount contributed
      * @param _secondsClaimed    total seconds claimed
      * @param _totalClaimed      total seed token amount claimed
      * @param _fee               fee on seed amount bought
    */
    function _addLock(
        address _recipient,
        uint256 _seedAmount,
        uint256 _fundingAmount,
        uint32  _secondsClaimed,
        uint256 _totalClaimed,
        uint256 _fee,
        uint256 _feeClaimed
    )
    internal
    {

        uint256 amountVestedPerSecond = _seedAmount.div(vestingDuration);
        require(amountVestedPerSecond > 0, "Seed: amountVestedPerSecond > 0");

        tokenLocks[_recipient] = Lock({
            seedAmount: _seedAmount,
            secondsClaimed: _secondsClaimed,
            totalClaimed: _totalClaimed,
            fundingAmount: _fundingAmount,
            fee: _fee,
            feeClaimed: _feeClaimed
            });
        totalLockCount++;
    }

    /**
      * @dev                     calculates claim for a lock
      * @param _locker           Address of lock to calculate days and amount claimable
    */
    function _calculateClaim(address _locker) private view returns (uint32, uint256) {
        Lock memory tokenLock = tokenLocks[_locker];

        // Check cliff was reached
        uint256 elapsedSeconds = _currentTime().sub(startTime);

        if (elapsedSeconds < vestingCliff) {
            return (uint32(elapsedSeconds), 0);
        }

        // If over vesting duration, all tokens vested
        if (elapsedSeconds >= vestingDuration) {
            return (vestingDuration, tokenLock.seedAmount.sub(tokenLock.totalClaimed));
        } else {
            uint256 amountVestedPerDay = tokenLock.seedAmount.div(uint256(vestingDuration));
            uint256 amountVested = uint256(elapsedSeconds.mul(amountVestedPerDay));
            return (uint32(elapsedSeconds), amountVested.sub(tokenLock.totalClaimed));
        }
        
    }
}
