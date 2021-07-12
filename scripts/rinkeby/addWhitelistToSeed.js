/*global web3, artifacts*/
require("dotenv").config();
const Seed = artifacts.require("Seed");
const seedDetails = require("../../seedDetails.json");
const axios = require("axios");

const toAscii = (str1) => {
    let hex = str1.toString();
    let str = "";
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
};

const fetchWhitelist = async (url) => {
    const whitelists = (await axios.get(url)).data.split(",");
    return whitelists.map((account) => {
        return account.replace(/\n/g, "");
    });
};

const addWhitelist = async (address, metadata) => {
    const seed = await Seed.at(address);
    const response = await axios.get(`https://ipfs.io/ipfs/${metadata}`);
    const whitelists = await fetchWhitelist(JSON.parse(response.data).seedDetails.whitelist);
    console.log(`${seed.address} will have this address added as whitelists :- ${whitelists}`);
    console.log(await seed.whitelisted(whitelists[0]));
    console.log("starting whitelist");
    seed.whitelistBatch(whitelists)
        .on('transactionHash', function(hash){
            console.log(hash);
        })
        .on('confirmation', function(confirmationNumber, receipt){
            console.log(confirmationNumber, receipt);
        })
        .on('receipt', function(receipt){
            console.log(receipt);
        })
        .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            console.log(error, receipt);
        })
        .then(() => {
            whitelists.forEach(async (address) => {
                const status = await seed.whitelisted(address);
                if (status) {
                    console.log(`${address} is whitelisted`);
                    return;
                }
                console.log(`${address} is not whitelisted`);
            });
            console.log("Succesfull!");
        })
        .catch((error) => console.log(error));
};

module.exports = async () => {
    const seeds = [
        {
            address: '0xe51e48E39ff4798D9262689A840423bE85209eF2',
            metadata: 'QmSafP3zf1tB6QGGptGucnJe5xQ2PajYbbVtSRPGQRbKec'
        }
    ];

    seeds.map(
        async (seed) => {
            await addWhitelist(seed.address, seed.metadata);
        }
    );
    
};
