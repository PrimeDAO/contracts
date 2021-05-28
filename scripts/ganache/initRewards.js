const StakingRewards = artifacts.require('StakingRewards');
const PrimeToken = artifacts.require('PrimeToken');

const contracts = require('../../contractAddresses.json');
const config = require('../../config.json');


module.exports = async function(callback) {
	const { toWei } = web3.utils;

    const yieldReward = toWei(config.yieldRewards.reward);
    const yieldStarTime = config.yieldRewards.startTime;
    const yieldDuration = config.yieldRewards.duration; 

	const staking = await StakingRewards.at("0x04f219CeE7F1F9037ba2d64EeDDf6646749B7f31");

    try {
        await console.log("***   Transfer StakingRewards");

        let token = await PrimeToken.at(contracts.ganache.PrimeToken);
        await token.transfer("0x04f219CeE7F1F9037ba2d64EeDDf6646749B7f31", yieldReward);

		await console.log("***   Initializing StakingRewards");
		await staking.initialize('PRIME/BAL', contracts.ganache.PrimeToken, '0xd716d8298fc38Ba19E8F5b7c3d4Ad76448A9cB38', yieldStarTime, yieldDuration, "0x7DB9d64fA90D64BC9524b8ad7a8e1c7BAae6669b");
		await console.log("***   Success");

    } catch(error) {

        await console.log(error);

    }

    callback();
}



