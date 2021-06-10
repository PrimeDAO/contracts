const Seed = artifacts.require('Seed');
const contracts = require('../../contractAddresses.json');
const details = require('../../seedDetails.json');
const fs = require('fs');

const toAscii = (str1) =>
{
    let hex  = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
};

const log = async (seed, fromWei) => {
    const seedDetails = {
        "SoftCap": fromWei((await seed.softCap()).toString(), 'ether'),
        "HardCap": fromWei((await seed.hardCap()).toString(), 'ether'),
        "Seed Amount Req": fromWei((await seed.seedAmountRequired()).toString(),'ether'),
        "Feed Amount Req": fromWei((await seed.feeAmountRequired()).toString(), 'ether'),
        "Price": fromWei((await seed.price()).toString(), 'ether'),
        "StartTime": (await seed.startTime()).toString(),
        "EndTime": (await seed.endTime()).toString(),
        "isPermissioned": await seed.permissionedSeed(),
        "Vesting duration": (await seed.vestingDuration()).toString(),
        "Vesting cliff": (await seed.vestingCliff()).toString(),
        "seed token": await seed.seedToken(),
        "funding token": await seed.fundingToken(),
        "fee": (await seed.fee()).toString(),
        "metadata": await seed.metadata(),
        "metadata in utf8": toAscii(await seed.metadata()),
        "admin": await seed.admin(),
        "beneficiary": await seed.beneficiary()
    };
    console.log(seedDetails);
    return seedDetails;
};

module.exports = async (callback) => {
    const { fromWei } = web3.utils;

    if(details?.details == undefined){
        details.details = {};
    }

    console.log("Testing Deployed Seed......");

    for(let i = 0; i < Object.keys(details.rinkeby).length; i++){
        let seed = await Seed.at(details.rinkeby[`seed${i+1}`]);
        console.log(`Seed ${i+1}......${details.rinkeby[`seed${i+1}`]}`);
        details.details[`seed${i+1}`] = await log(seed, fromWei);
    }

    fs.writeFileSync(
        './seedDetails.json',
        JSON.stringify(details)
    );

    callback();
}