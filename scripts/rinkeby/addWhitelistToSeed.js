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
    seed.whitelistBatch(whitelists)
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
            address: '0x36cd8C4534262941c40270a5885dcF2Ca14a469F',
            metadata: 'QmektwNKexJ18mbJJRhZ6oY4PiQk9Ug6NAhpzyY1BZdxmB'
        },
        {
            address: '0xc9924D8822996b760EC939D22Ea8bf8830c2e08c',
            metadata: 'QmUpsfCoMEsaJ5yMA2BkCuBhxAyy113CXZWqrjmk5UVGZX'
        }
    ];

    seeds.map(
        async (seed) => {
            await addWhitelist(seed.address, seed.metadata);
        }
    );
    
};
