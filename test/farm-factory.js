/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BPool = artifacts.require('BPool');
const FarmFactory = artifacts.require('FarmFactory');

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
    // deploy farmFactory
    setup.farmFactory = await helpers.setup.farmFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('FarmFactory', (accounts) => {
    let setup;
    let rewardToken;
    let stakingToken;
    let rewardAmount = (BigInt(925 * 100 * 100000000000000000)).toString(); // "92500000000000003145728"
    let starttime = 1600560000; // 2020-09-20 00:00:00 (UTC +00:00)
    let durationDays = 7;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });
    context('» contract is not initialized yet', () => {
        context('» parameters are valid', () => {
            // proxy has already been initialized during setup
            it('it initializes farm manager', async () => {
                expect(await setup.farmFactory.initialized()).to.equal(true);
                expect(await setup.farmFactory.avatar()).to.equal(setup.organization.avatar.address);
            });
        });
        context('» avatar parameter is not valid', () => {
            before('!! deploy farm manager', async () => {
                setup.farmFactory = await FarmFactory.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.farmFactory.initialize(constants.ZERO_ADDRESS), 'FarmFactory: avatar cannot be null');
            });
        });
    });
    context('» contract is initialized ', () => {
        context('» avatar parameter is valid', () => {
            before('!! deploy farm manager', async () => {
                setup = await deploy(accounts);
                rewardToken = await setup.tokens.erc20s[0];
                stakingToken = await setup.tokens.erc20s[1];

                await rewardToken.transfer(setup.organization.avatar.address, rewardAmount);                
            });
            it('creates a farm', async () => {

                const calldata = helpers.encodeCreateFarm(rewardToken.address, stakingToken.address, rewardAmount, starttime, durationDays);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, constants.ZERO_BYTES32);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                // store data
                setup.data.tx = tx;

                await expectEvent.inTransaction(setup.data.tx.tx, setup.farmFactory, 'FarmCreated', {});
            });
        });
    });

});
