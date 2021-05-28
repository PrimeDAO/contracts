const CRPFactory = artifacts.require("CRPFactory");
const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");
const PrimeToken = artifacts.require("PrimeToken");
const BAL = artifacts.require("PrimeToken");

const contracts = require("../../contractAddresses.json");
const config = require("../../config.json");
// const web3 = require('web3');

const fs = require("fs");

module.exports = async function(callback) {
    const { toWei } = web3.utils;
    const MAX = web3.utils.toTwosComplement(-1);

    // pool params
    const primeAmount = toWei(config.crPool2.PRIMEAmount);
    const balAmount = toWei(config.crPool2.BALAmount);

    const swapFee = toWei(config.crPool2.swapFee);
    const tokenAddresses = [contracts.rinkeby.PrimeToken, contracts.rinkeby.BAL];
    const startWeights = [toWei(config.crPool2.PRIMEWeight), toWei(config.crPool2.BALWeight)];
    const startBalances = [primeAmount, balAmount];
    const SYMBOL = config.crPool2.lpTokenSymbol;
    const NAME = config.crPool2.lpTokenName;
    const bPrimeAmount = toWei(config.crPool2.lpTokenAmount);

    const prime = await PrimeToken.at(contracts.rinkeby.PrimeToken);
    console.log("Problem starts");
    const bal = await BAL.at(contracts.rinkeby.BAL);

    const permissions = {
        canPauseSwapping: true,
        canChangeSwapFee: true,
        canChangeWeights: true,
        canAddRemoveTokens: true,
        canWhitelistLPs: false,
    };
    console.log("if this happens");

    const poolParams = {
        poolTokenSymbol: SYMBOL,
        poolTokenName: NAME,
        constituentTokens: tokenAddresses,
        tokenBalances: startBalances,
        tokenWeights: startWeights,
        swapFee: swapFee,
    };

    console.log("before crp");

    const crpFactory = await CRPFactory.at(contracts.rinkeby.CRPFactory);

    console.log("before try");

    try {
        await console.log("***   Deploying a PRIME Configurable Rights Pool");

        let POOL = await crpFactory.newCrp.call(contracts.rinkeby.BFactory, poolParams, permissions);

        await crpFactory.newCrp(contracts.rinkeby.BFactory, poolParams, permissions);

        await console.log("***   Success ");

        const pool = await ConfigurableRightsPool.at(POOL);

        await console.log("***   Approving tokens for public swapping");

        await bal.approve(POOL, MAX);
        await prime.approve(POOL, MAX);

        await console.log("***   Success");

        await console.log("***   Consuming the collateral; mint and xfer N BPTs to caller ");

        await pool.createPool(bPrimeAmount);

        await console.log("***   Success");

        await console.log("***   Configurable Rights Pool address:");
        await console.log(pool.address);
        await console.log("***   Balancer Pool address:");
        await console.log(await pool.bPool());

        contracts.rinkeby.ConfigurableRightsPool = pool.address;
        contracts.rinkeby.BPool = await pool.bPool();

        // fs.writeFileSync('./contractAddresses.json', JSON.stringify(contracts), (err) => {
        //    if (err) throw err;
        // });
    } catch (error) {
        console.log("Catch - error");
        await console.log(error);
    }

    callback();
};
