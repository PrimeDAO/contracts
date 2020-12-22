const CRPFactory = artifacts.require("CRPFactory");
const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");
const PrimeToken = artifacts.require('PrimeToken');
const WETH = artifacts.require('WETH');

const contracts = require('../../contractAddresses.json');
const config = require('../../config.json');

const fs = require("fs");

module.exports = async function(callback) {
	const { toWei } = web3.utils;
	const MAX = web3.utils.toTwosComplement(-1);

	// pool params
	const primeAmount = toWei(config.crPool.PRIMEAmount);
	const wethAmount = toWei(config.crPool.WETHAmount);

	const swapFee = toWei(config.crPool.swapFee);
	const tokenAddresses = [contracts.mainnet.PrimeToken, contracts.mainnet.WETH];
	const startWeights = [toWei(config.crPool.PRIMEWeight), toWei(config.crPool.WETHWeight)];
	const startBalances = [primeAmount, wethAmount];
	const SYMBOL = config.crPool.lpTokenSymbol;
	const NAME = config.crPool.lpTokenName;
	const bPrimeAmount = toWei(config.crPool.lpTokenAmount);

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

	const prime = await PrimeToken.at(contracts.mainnet.PrimeToken);
	const weth = await WETH.at(contracts.mainnet.WETH);

	const crpFactory = await CRPFactory.at(contracts.mainnet.CRPFactory);

    try {

		await console.log("***   Deploying a PRIME Configurable Rights Pool");

		POOL = await crpFactory.newCrp.call(
		        contracts.mainnet.BFactory,
		        poolParams,
		        permissions,
		);

		await crpFactory.newCrp(
		        contracts.mainnet.BFactory,
		        poolParams,
		        permissions,
		);

		await console.log("***   Success ");

		const pool = await ConfigurableRightsPool.at(POOL);

		await console.log("***   Approving tokens for public swapping");

		await weth.approve(POOL, MAX);
		await prime.approve(POOL, MAX);

		await console.log("***   Success");

		await console.log("***   Consuming the collateral; mint and xfer N BPTs to caller ");

		await pool.createPool(bPrimeAmount);

		await console.log("***   Success");

		await console.log("***   Configurable Rights Pool address:");
		await console.log(pool.address);
		await console.log("***   Balancer Pool address:");
		await console.log(await pool.bPool());

		contracts.mainnet.ConfigurableRightsPool = pool.address;
		contracts.mainnet.BPool = await pool.bPool();

		fs.writeFileSync('./contractAddresses.json', JSON.stringify(contracts), (err) => {
		   if (err) throw err;
		});

    } catch(error) {

        await console.log(error);

    }

    callback();
}
