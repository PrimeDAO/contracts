/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const FarmFactory = artifacts.require('FarmFactory');
const StakingRewards = artifacts.require('StakingRewards');
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
    let rescueToken;
    let receipt;
    let name;
    let newFarm;
    let rewardAmount = toWei('9249.999999999999475712');
    let rescueAmount = toWei('100');
    let stakingAmount = toWei('100');

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
            it('it reverts', async () => {
                await expectRevert(setup.farmFactory.initialize(setup.organization.avatar.address), 'FarmFactory: contract already initialized');
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
                name = 'newFarm';
                rewardToken = await setup.tokens.erc20s[0];
                stakingToken = await setup.tokens.erc20s[1];
                rescueToken = await setup.tokens.erc20s[2];

                await rewardToken.transfer(setup.organization.avatar.address, rewardAmount);
            });
            it('creates a farm', async () => {

                const calldata = helpers.encodeCreateFarm(name, rewardToken.address, stakingToken.address, rewardAmount, starttime, durationDays, setup.organization.avatar.address);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, constants.ZERO_BYTES32);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                // store data
                setup.data.tx = tx;
                receipt = await expectEvent.inTransaction(setup.data.tx.tx, setup.farmFactory, 'FarmCreated', {});
            });
            it('fails to run create on uninitialized farm', async () => {
                const farmFactory = await FarmFactory.new();
                await expectRevert( farmFactory.createFarm(name, rewardToken.address, stakingToken.address, rewardAmount, starttime, durationDays),
                    'FarmFactory: contract not initialized');
            });
            it('fails to create a farm not using avatar', async () => {

                await expectRevert( setup.farmFactory.createFarm(name, rewardToken.address, stakingToken.address, rewardAmount, starttime, durationDays),
                    'FarmFactory: protected operation');
            });
            it('fails to create a farm because of low balance', async () => {
                const balanceBefore = await rewardToken.balanceOf(setup.organization.avatar.address);
                const calldata = helpers.encodeCreateFarm(name, rewardToken.address, stakingToken.address, rewardAmount, starttime, durationDays, setup.organization.avatar.address);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, constants.ZERO_BYTES32);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                // store data
                setup.data.tx = tx;
                const balance = await rewardToken.balanceOf(setup.organization.avatar.address);
                await expectEvent.notEmitted(setup.data.tx, setup.farmFactory, 'FarmCreated', {});
                expect(BigInt(balanceBefore)).to.equal(BigInt(balance));
            });
            it('fails to increase a reward because of low balance', async () => {
                newFarm = receipt.args[0];

                const balanceBefore = await rewardToken.balanceOf(newFarm);
                const calldata = helpers.encodeIncreaseReward(newFarm, stakingAmount);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, accounts[1]);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0,  constants.ZERO_ADDRESS);

                const balance = await rewardToken.balanceOf(newFarm);
                // store data
                setup.data.tx = tx;
                await expectEvent.notEmitted(setup.data.tx, 'RewardIncreased');
                expect(BigInt(balance)).to.equal(BigInt(balanceBefore));
            });
            it('increases a reward', async () => {
                const balanceBefore = await rewardToken.balanceOf(newFarm);
                await rewardToken.transfer((setup.organization.avatar.address), stakingAmount);

                const calldata = helpers.encodeIncreaseReward(newFarm, stakingAmount);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, accounts[1]);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0,  constants.ZERO_ADDRESS);

                // store data
                setup.data.tx = tx;
                const balance = await rewardToken.balanceOf(newFarm);
                await expectEvent.inTransaction(setup.data.tx.tx, setup.farmFactory, 'RewardIncreased', {});
                expect(BigInt(balance)).to.equal(BigInt(balanceBefore) + BigInt(stakingAmount));
            });
            it('fails to rescue tokens, as asked for more then staked', async () => {
                const balanceBefore = await rewardToken.balanceOf(newFarm);
                const calldata = helpers.encodeRescueTokens(newFarm, rescueAmount, rewardToken.address, accounts[1]);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, constants.ZERO_BYTES32);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                // store data
                setup.data.tx = tx;

                const balance = await rewardToken.balanceOf(newFarm);
                await expectEvent.notEmitted(setup.data.tx, 'TokenRescued');
                expect(BigInt(balance)).to.equal(BigInt(balanceBefore));
            });
            it('rescues tokens', async () => {
                // send rescue token to the farm address
                await rescueToken.transfer(newFarm, rescueAmount);
                const balanceBefore = await rescueToken.balanceOf(newFarm);
                const calldata = helpers.encodeRescueTokens(newFarm, rescueAmount, rescueToken.address, accounts[1]);
                const _tx = await setup.primeDAO.farmManager.proposeCall(calldata, 0, constants.ZERO_BYTES32);
                const proposalId = helpers.getNewProposalId(_tx);
                const tx = await  setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                // store data
                setup.data.tx = tx;

                const balance = await rescueToken.balanceOf(newFarm);
                await expectEvent.inTransaction(setup.data.tx.tx, setup.farmFactory, 'TokenRescued', {});
                expect(BigInt(balance)).to.equal(BigInt(balanceBefore)-BigInt(rescueAmount));
            });

        });
    });

});
