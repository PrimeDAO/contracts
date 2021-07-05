/*global web3, artifacts*/
require('dotenv').config();
const Seed = artifacts.require("Seed");
const seedDetails = require('../../seedDetails.json');
const axios = require('axios');

const toAscii = (str1) =>
{
    let hex  = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
};

const fetchWhitelist = async (url) => {
    const whitelists = (await axios.get(url)).data.split(',');
    return whitelists.map((account)=>{
        return account.replace(/\n/g, '');
    });
};

module.exports = async () => {
    try {
        const seed = await Seed.new();
        const response = await axios.get(`https://ipfs.io/ipfs/QmbhX5YEh9umusWL1mxp7G5NJQ6UzKPjDzzTsWF7BaqsfW`);
        const whitelists = await fetchWhitelist(JSON.parse(response.data).seedDetails.whitelist);
        console.log("address to be whitelisted:- ", whitelists);
        await seed.whitelistBatch(whitelists);
    } catch (error) {
        console.log(error);
    }
};
