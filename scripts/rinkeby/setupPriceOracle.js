const PrimeToken = artifacts.require('PrimeToken');
const PriceOracle = artifacts.require('PriceOracle');


const contracts = require('../../contractAddresses.json');


module.exports = async function(callback) {
	const { toWei } = web3.utils;

    const numerator = toWei('1');
    const denominator = toWei('137'); 

	const prime = contracts.kovan.PrimeToken;
	const oracle = await PriceOracle.at(contracts.kovan.PriceOracle);

    try {

		await console.log("***   Setting token price");
		await oracle.setTokenPrice(prime, numerator, denominator);
		await console.log("***   Success");

    } catch(error) {

        await console.log(error);

    }

    callback();
}
