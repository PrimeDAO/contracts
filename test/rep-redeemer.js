/*global web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { time, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const { toWei } = web3.utils;

const deploy = async (accounts) => {
    // initialize test setup
    const setup = await helpers.setup.initialize(accounts[0]);
    // deploy ERC20s
    setup.tokens = await helpers.setup.tokens(setup);
    // deploy DAOStack meta-contracts
    setup.DAOStack = await helpers.setup.DAOStack(setup);
    // deploy organization
    setup.organization = await helpers.setup.organization(setup);
    // deploy balancer infrastructure
    setup.balancer = await helpers.setup.balancer(setup);
    // deploy token4rep
    setup.token4rep = await helpers.setup.token4rep(setup);
    // deploy ERC20s
    setup.repRedeemer = await helpers.setup.repRedeemer(setup);
    // deploy farmFactory
    setup.farmFactory = await helpers.setup.farmFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('RepRedeemer', (accounts) => {
    let setup;
    let tokenLockAmount;
    let staker1;
    let staker2;
    let staker3;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
        tokenLockAmount = toWei('100');
        staker1 = accounts[0];
        staker2 = accounts[1];
        staker3 = accounts[2];

        // fund stakers accounts
        await setup.tokens.primeToken.transfer(staker2, tokenLockAmount);
        await setup.tokens.primeToken.transfer(staker3, tokenLockAmount);
    });
    context('» redeem reputation in batch', () => {
        it('it should lock tokens for reputation', async () => {
            //approve tokens from all stakers
            await setup.tokens.primeToken.approve(setup.token4rep.contract.address, tokenLockAmount, {from: staker1});
            await setup.tokens.primeToken.approve(setup.token4rep.contract.address, tokenLockAmount, {from: staker2});
            await setup.tokens.primeToken.approve(setup.token4rep.contract.address, tokenLockAmount, {from: staker3});
            // stake tokens from all stakers
            setup.data.tx1 = await setup.token4rep.contract.lock(tokenLockAmount, setup.token4rep.params.maxLockingPeriod, setup.tokens.primeToken.address,"0x0000000000000000000000000000000000000000", {from: staker1});
            setup.data.tx2 = await setup.token4rep.contract.lock(tokenLockAmount, setup.token4rep.params.maxLockingPeriod, setup.tokens.primeToken.address,"0x0000000000000000000000000000000000000000", {from: staker2});
            setup.data.tx3 = await setup.token4rep.contract.lock(tokenLockAmount, setup.token4rep.params.maxLockingPeriod, setup.tokens.primeToken.address,"0x0000000000000000000000000000000000000000", {from: staker3});
            // check events
            await expectEvent.inTransaction(setup.data.tx1.tx, setup.token4rep.contract, 'LockToken');
            await expectEvent.inTransaction(setup.data.tx2.tx, setup.token4rep.contract, 'LockToken');
            await expectEvent.inTransaction(setup.data.tx3.tx, setup.token4rep.contract, 'LockToken');
                
            // increase time
            await time.increase(time.duration.weeks(10));

            let repBeforeRedeem = (await setup.organization.reputation.balanceOf(staker2)).toNumber();

            // redeem rep in batch
            await setup.repRedeemer.redeemLocking4Reputation(setup.token4rep.contract.address, [staker1, staker2, staker3]);

            let repAfterRedeem = (await setup.organization.reputation.balanceOf(staker2)).toNumber();

            expect(repAfterRedeem).to.be.above(repBeforeRedeem);
        });
    });
});
