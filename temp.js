const SeedFactory = artifacts.require('SeedFactory');
const addresses = require('./contractAddresses.json');

module.exports = async () => {
    const factory = new web3.eth.Contract(SeedFactory.abi, addresses.rinkeby.SeedFactory);
    const events = await factory.getPastEvents('SeedCreated',{fromBlock: 0, toBlock: 'latest'}, (err, events)=>console.log(err));
    console.log(events);
    console.log(events.length);
}