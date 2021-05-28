const CRPFactory = artifacts.require("CRPFactory");
const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");
const PrimeToken = artifacts.require('PrimeToken');
const BAL = artifacts.require('PrimeToken');

const contracts = require('../../contractAddresses.json');
const config = require('../../config.json');

const fs = require("fs");

module.exports = async function(callback) {
	const { toWei } = web3.utils;
	const MAX = web3.utils.toTwosComplement(-1);

	// pool params
	const primeAmount = toWei(config.crPool2.PRIMEAmount);
	const balAmount = toWei(config.crPool2.BALAmount);

	const swapFee = toWei(config.crPool2.swapFee);
	const tokenAddresses = [contracts.ganache.PrimeToken, contracts.ganache.BAL];
	const startWeights = [toWei(config.crPool2.PRIMEWeight), toWei(config.crPool2.BALWeight)];
	const startBalances = [primeAmount, balAmount];
	const SYMBOL = config.crPool2.lpTokenSymbol;
	const NAME = config.crPool2.lpTokenName;
	const bPrimeAmount = toWei(config.crPool2.lpTokenAmount);


	const prime = await PrimeToken.at(contracts.ganache.PrimeToken);
	const bal = await BAL.at(contracts.ganache.BAL);

	const permissions = {
	      canPauseSwapping: true,
	      canChangeSwapFee: true,
	      canChangeWeights: true,
	      canAddRemoveTokens: true,
	      canWhitelistLPs: false,
	};

	const poolParams = {
	      poolTokenSymbol: SYMBOL,
	      poolTokenName: NAME,
	      constituentTokens: tokenAddresses,
	      tokenBalances: startBalances,
	      tokenWeights: startWeights,
	      swapFee: swapFee,
	};

	const crpFactory = await CRPFactory.at(contracts.ganache.CRPFactory);

    try {

		await console.log("***   Deploying a PRIME Configurable Rights Pool");

		POOL = await crpFactory.newCrp.call(
		        contracts.ganache.BFactory,
		        poolParams,
		        permissions,
		);

		await crpFactory.newCrp(
		        contracts.ganache.BFactory,
		        poolParams,
		        permissions,
		);

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

		contracts.ganache.ConfigurableRightsPool = pool.address;
		contracts.ganache.BPool = await pool.bPool();

		// fs.writeFileSync('./contractAddresses.json', JSON.stringify(contracts), (err) => {
		//    if (err) throw err;
		// });

    } catch(error) {

        await console.log(error);

    }

    callback();
}
