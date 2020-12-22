pragma solidity >=0.5.0;


interface IConfigurableRightsPool {

    enum Permissions { PAUSE_SWAPPING,
                       CHANGE_SWAP_FEE,
                       CHANGE_WEIGHTS,
                       ADD_REMOVE_TOKENS,
                       WHITELIST_LPS,
                       CHANGE_CAP }

    function setSwapFee(uint swapFee) external;
    function isPublicSwap()
        external
        view
        returns (bool);
    function setCap(uint newCap) external;
    function setPublicSwap(bool publicSwap) external;
    function createPool(
        uint initialSupply,
        uint minimumWeightChangeBlockPeriodParam,
        uint addTokenTimeLockInBlocksParam
    ) external;
    function createPool(uint initialSupply) external;
    function updateWeight(address token, uint newWeight) external;
    function updateWeightsGradually(
        uint[] calldata newWeights,
        uint startBlock,
        uint endBlock
    ) external;
    function pokeWeights() external;
    function commitAddToken(
        address token,
        uint balance,
        uint denormalizedWeight
    ) external;
    function applyAddToken() external;
    function removeToken(address token) external;
    function joinPool(uint poolAmountOut, uint[] calldata maxAmountsIn) external;
    function exitPool(uint poolAmountIn, uint[] calldata minAmountsOut) external;
    function joinswapExternAmountIn(
        address tokenIn,
        uint tokenAmountIn,
        uint minPoolAmountOut
    )
        external
        returns (uint poolAmountOut);
    function joinswapPoolAmountOut(
        address tokenIn,
        uint poolAmountOut,
        uint maxAmountIn
    )
        external
        returns (uint tokenAmountIn);
    function exitswapPoolAmountIn(
        address tokenOut,
        uint poolAmountIn,
        uint minAmountOut
    )
        external
        returns (uint tokenAmountOut);
    function exitswapExternAmountOut(
        address tokenOut,
        uint tokenAmountOut,
        uint maxPoolAmountIn
    )
        external
        returns (uint poolAmountIn);
    function whitelistLiquidityProvider(address provider) external;
    function removeWhitelistedLiquidityProvider(address provider) external;
    function canProvideLiquidity(address provider)
        external
        view
        returns(bool);
    function hasPermission(Permissions permission)
        external
        view
        returns(bool);
    function getDenormalizedWeight(address token)
        external
        view
        returns (uint);
    function getRightsManagerVersion() external pure returns (address);
    function getBalancerSafeMathVersion() external pure returns (address);
    function getSmartPoolManagerVersion() external pure returns (address);
    function mintPoolShareFromLib(uint amount) external;
    function pushPoolShareFromLib(address to, uint amount) external;
    function pullPoolShareFromLib(address from, uint amount) external;
    function burnPoolShareFromLib(uint amount) external;








}
