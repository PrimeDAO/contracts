const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");

const contracts = require('../../contractAddresses.json');
const fs = require("fs");

module.exports = async function(callback) {

    try {

		await console.log("***   Moving pool ownership to DAO");

		const pool = await ConfigurableRightsPool.at(contracts.ganache.ConfigurableRightsPool);
	 	await pool.setController(contracts.ganache.Avatar);

		await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
}
