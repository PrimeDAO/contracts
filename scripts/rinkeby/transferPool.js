const ConfigurableRightsPool = artifacts.require("ConfigurableRightsPool");

const contracts = require('../../contractAddresses.json');
const fs = require("fs");

module.exports = async function(callback) {

    try {

		await console.log("***   Moving pool ownership to DAO");

		const pool = await ConfigurableRightsPool.at(contracts.rinkeby.ConfigurableRightsPool);
	 	await pool.setController(contracts.rinkeby.Avatar);

		await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
}
