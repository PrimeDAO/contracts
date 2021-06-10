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

    if(details?.seedDetails == undefined){
        details.seedDetails = {};
    }

    const { fromWei } = web3.utils;

    console.log("Testing Deployed Seed......");

    let seed = await Seed.at(details.rinkeby.seed1);
    console.log(`Seed 1......${details.rinkeby.seed1}`);
    details.seedDetails.seed1 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed2);
    console.log(`Seed 2......${details.rinkeby.seed2}`);
    details.seedDetails.seed2 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed3);
    console.log(`Seed 3......${details.rinkeby.seed3}`);
    details.seedDetails.seed3 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed4);
    console.log(`Seed 4......${details.rinkeby.seed4}`);
    details.seedDetails.seed4 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed5);
    console.log(`Seed 5......${details.rinkeby.seed5}`);
    details.seedDetails.seed5 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed6);
    console.log(`Seed 6......${details.rinkeby.seed6}`);
    details.seedDetails.seed6 = await log(seed, fromWei);
    
    seed = await Seed.at(details.rinkeby.seed7);
    console.log(`Seed 7......${details.rinkeby.seed7}`);
    details.seedDetails.seed7 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed8);
    console.log(`Seed 8......${details.rinkeby.seed8}`);
    details.seedDetails.seed8 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed9);
    console.log(`Seed 9......${details.rinkeby.seed9}`);
    details.seedDetails.seed9 = await log(seed, fromWei);

    seed = await Seed.at(details.rinkeby.seed10);
    console.log(`Seed 10......${details.rinkeby.seed10}`);
    details.seedDetails.seed10 = await log(seed, fromWei);

    fs.writeFileSync(
        './seedDetails.json',
        JSON.stringify(details)
    );

    callback();
}