/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');

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
    // deploy incentives contract
    setup.incentives = await helpers.setup.incentives(setup);
    // deploy seedFactory
    setup.seedFactory = await helpers.setup.seedFactory(setup);
    // deploy farmFactory
    setup.farmFactory = await helpers.setup.farmFactory(setup);
    // deploy primeDAO governance
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

const deployStakingClone = async (setup, stakingOptions) => {
    const calldata = helpers.encodeCreateFarm(...stakingOptions);
    const _tx = await setup.primeDAO.farmManager.proposeCalls([setup.farmFactory.address],[calldata], [0], constants.ZERO_BYTES32);
    const proposalId = helpers.getNewProposalId(_tx);
    await setup.primeDAO.farmManager.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
    const tx = await setup.primeDAO.farmManager.execute(proposalId);
    setup.data.tx = tx;
    const receipt = await expectEvent.inTransaction(setup.data.tx.tx, setup.farmFactory, 'FarmCreated', {});
    return await StakingRewards.at(receipt.args[0]);
};

contract('StakingRewards Clone', (accounts) => {
    let setup;
    let stakeAmount;
    let halfStake;
    let rewardAmount;
    let _name = 'newFarm';
    // let rescueAmount = toWei('100');
    // let stakingAmount = toWei('100');
    let _initreward = toWei('9249.999999999999475712');
    let _badInitReward;
    let _starttime = 1600560000; // 2020-09-20 00:00:00 (UTC +00:00)
    let _durationDays = 7;
    let initTime;
    let rewardToken;
    let stakingToken;
    // let rescueToken;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });

    context('» clone contract is initialized ', async () => {
        before('!! deploy clone', async () => {
            [rewardToken, stakingToken] = await setup.tokens.erc20s;
            await rewardToken.transfer(setup.organization.avatar.address, _initreward);
            const stakingOptions = [_name, rewardToken.address, stakingToken.address, _initreward, _starttime, _durationDays, setup.organization.avatar.address];
            setup.incentives.stakingRewards = await deployStakingClone(setup, stakingOptions);
            await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
        });
        context('» reverts when initialise is called', () => {
            it('it cannot initializes contract', async () => {
                await expectRevert(setup.incentives.stakingRewards.initialize(_name, setup.tokens.primeToken.address, setup.balancer.pool.address, _starttime, _durationDays, setup.organization.avatar.address),
                    'StakingRewards: contract already initialized');
            });
        });
        context('» initialised correctly', async () => {
            it('correct total rewards', async () => {
                const totalSupply = await setup.incentives.stakingRewards.totalRewards();
                expect(totalSupply.toString()).to.equal(_initreward);
            });
            it('correct start time', async () => {
                const startTime = await setup.incentives.stakingRewards.starttime();
                expect(startTime.toString()).to.equal(_starttime.toString());
            });
            it('correct duration', async () => {
                const duration = await setup.incentives.stakingRewards.duration();
                expect(duration.toString()).to.equal((_durationDays*24*60*60).toString());
            });
            it('lastUpdateTime == startTime', async () => {
                const lastUpdateTime = await setup.incentives.stakingRewards.lastUpdateTime();
                expect(lastUpdateTime.toString()).to.equal(_starttime.toString());
            });
        });
    });
    context('# stake', async () => {
        before('!! deploy clone', async () => {
            setup = await deploy(accounts);
            stakeAmount = toWei('100');
        });
        context('stake parameter is not valid', async () => {
            before('!! deploy clone and fund', async () => {
                [rewardToken, stakingToken] = await setup.tokens.erc20s;
                await rewardToken.transfer(setup.organization.avatar.address, _initreward);
                const stakingOptions = [_name, rewardToken.address, stakingToken.address, _initreward, _starttime, _durationDays, setup.organization.avatar.address];
                setup.incentives.stakingRewards = await deployStakingClone(setup, stakingOptions);
                await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
            });
            it('it reverts', async () => {
                await expectRevert(
                    setup.incentives.stakingRewards.stake(toWei('0')),
                    'StakingRewards: cannot stake 0'
                );
            });
        });
    });
});