const PrimeToken = artifacts.require('PrimeToken');
const PriceOracle = artifacts.require('PriceOracle');
const LockingToken4Reputation = artifacts.require('LockingToken4Reputation');

const contracts = require('../../contractAddresses.json');

module.exports = async function(callback) {

    try {
        const { toWei } = web3.utils;

        const numerator = toWei('1');
        const denominator = toWei('1'); 

        const prime = contracts.mainnet.PrimeToken;
        const oracle = await PriceOracle.at(contracts.mainnet.PriceOracle);
        const lt4r = await LockingToken4Reputation.at(contracts.mainnet.LockingToken4Reputation);

        await console.log("***   Setting token price");
        await oracle.setTokenPrice(prime, numerator, denominator);
        await console.log("***   Success");

        await console.log("***   Initializing LockingToken4Reputation");
        await lt4r.initialize(contracts.mainnet.Avatar, "8000000000000000000000", 1612742400, 1615161600, 1615766400, 10520000, contracts.mainnet.PriceOracle, "0x0000000000000000000000000000000000000000");
        await console.log("***   Success");

    } catch(error) {

        await console.log(error);

    }

    callback();
}
