/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const TokenVesting = artifacts.require('TokenVesting');

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
    // deploy VestingFactory
    setup.vesting = await helpers.setup.vesting(setup);
    // deploy primeDAO governance
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('PrimeToken', (accounts) => {
    let setup;
    let testSetup;
    let tokenLockAmount;
    let lockingId;
    let owner; // vesting contract owner
    let beneficiary; // vesting beneficiary
    let start; // vesting start
    let tokenVestAmount; // amount of tokens vested
    let vestingAddress; // vesting contract address
    let vestingContract; // vesting contract instance
    let nonrevokableVestingContract; // non-revokable vesting contract instance
    let halfVested;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
        testSetup = setup.token4rep.params;
        tokenLockAmount = toWei('100');
    });
    context('» token4rep', () => {
        context('» parameters are valid', () => {
            it('it should check that scheme is intitalized', async () => {
                expect((await setup.token4rep.contract.reputationRewardLeft()).toNumber()).to.equal(testSetup.reputationReward);
            });
            it('it should lock tokens for reputation', async () => {
                await setup.tokens.primeToken.approve(setup.token4rep.contract.address, tokenLockAmount);
                let tx = await setup.token4rep.contract.lock(tokenLockAmount, setup.token4rep.params.maxLockingPeriod, setup.tokens.primeToken.address,"0x0000000000000000000000000000000000000000");
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.token4rep.contract, 'LockToken');
                lockingId = await setup.data.tx.logs[0].args._lockingId;
            });
            it('it should redeem reputation', async () => {
                await time.increase(setup.token4rep.params.redeemEnableTime + await time.latest());
                let tx = await setup.token4rep.contract.redeem(setup.root);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.token4rep.contract, 'Redeem');
            });
            it('it should release tokens', async () => {
                let tx = await setup.token4rep.contract.release(setup.root, lockingId);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.token4rep.contract, 'Release');
            });
        });
    });
    context('» vesting: revokable', () => {
        context('» parameters are invalid', () => {
            it('owner is the zero address', async () => {
                owner = constants.ZERO_ADDRESS;
                beneficiary = accounts[1];
                start = await time.latest();
                await expectRevert(setup.vesting.factory.create(owner, beneficiary, start, setup.vesting.params.cliffDuration, setup.vesting.params.duration, setup.vesting.params.revocable), 'VestingFactory: owner is the zero address');
            });
            it('beneficiary is the zero address', async () => {
                owner = accounts[0];
                beneficiary = constants.ZERO_ADDRESS;
                start = await time.latest();
                await expectRevert(setup.vesting.factory.create(owner, beneficiary, start, setup.vesting.params.cliffDuration, setup.vesting.params.duration, setup.vesting.params.revocable), 'TokenVesting: beneficiary is the zero address');
            });
            it('cliff is longer than duration', async () => {
                owner = accounts[0];
                beneficiary = accounts[1];
                start = await time.latest();
                let badCliff = setup.vesting.params.duration + 1;
                await expectRevert(setup.vesting.factory.create(owner, beneficiary, start, badCliff, setup.vesting.params.duration, setup.vesting.params.revocable), 'TokenVesting: cliff is longer than duration');
            });
            it('duration is 0', async () => {
                owner = accounts[0];
                beneficiary = accounts[1];
                start = await time.latest();
                let zeroDuration = 0;
                await expectRevert(setup.vesting.factory.create(owner, beneficiary, start, setup.vesting.params.cliffDuration, zeroDuration, setup.vesting.params.revocable), 'TokenVesting: duration is 0');
            });
            it('final time is before current time', async () => {
                owner = accounts[0];
                beneficiary = accounts[1];
                start = await time.latest();
                let badStart = 0;
                await expectRevert(setup.vesting.factory.create(owner, beneficiary, badStart, setup.vesting.params.cliffDuration, setup.vesting.params.duration, setup.vesting.params.revocable), 'TokenVesting: final time is before current time');
            });
        });
        context('» parameters are valid', () => {
            it('it should create a vesting contract', async () => {
                owner = accounts[0];
                beneficiary = accounts[1];
                start = await time.latest();
                let tx = await setup.vesting.factory.create(owner, beneficiary, start, setup.vesting.params.cliffDuration, setup.vesting.params.duration, setup.vesting.params.revocable);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.vesting.factory, 'VestingCreated');
                vestingAddress = setup.data.tx.logs[0].args.vestingContractAddress;
            });
            it('it should fail on release', async () => {
                vestingContract = await TokenVesting.at(vestingAddress);
                await expectRevert(vestingContract.release(setup.tokens.primeToken.address, {from: beneficiary}), 'TokenVesting: no tokens are due');
            });
            it('it should top up a vesting contract', async () => {
                tokenVestAmount = toWei('100000');
                await setup.tokens.primeToken.transfer(vestingAddress, tokenVestAmount);
                expect((await setup.tokens.primeToken.balanceOf(vestingAddress)).toString()).to.equal(tokenVestAmount.toString());
            });
            it('returns vesting params: beneficiary', async () => {
                expect(await vestingContract.beneficiary()).to.equal(beneficiary);
            });

            it('returns vesting params: cliff', async () => {
                expect((await vestingContract.cliff()).toString()).to.equal((start).toString());
            });

            it('returns vesting params: start', async () => {
                expect((await vestingContract.start()).toString()).to.equal((start).toString());
            });
            it('returns vesting params: duration', async () => {
                expect((await vestingContract.duration()).toString()).to.equal((setup.vesting.params.duration).toString());
            });
            it('returns vesting params: revocable', async () => {
                expect(await vestingContract.revocable()).to.equal(setup.vesting.params.revocable);
            });
            it('it should release succesfully', async () => {
                // check half time passed
                await time.increase(setup.vesting.params.duration/2);
                let tx = await vestingContract.release(setup.tokens.primeToken.address, {from: beneficiary});
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, vestingContract, 'TokensReleased');
                expect((await setup.tokens.primeToken.balanceOf(beneficiary)).toString()).to.equal((setup.data.tx.logs[0].args.amount).toString());
            });
            it('returns vesting params: released', async () => {
                expect((await vestingContract.released(setup.tokens.primeToken.address)).toString()).to.equal((await setup.tokens.primeToken.balanceOf(beneficiary)).toString());
            });
            it('it should revoke succesfully', async () => {
                // check half time passed
                let tx = await vestingContract.revoke(setup.tokens.primeToken.address, {from: owner});
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, vestingContract, 'TokenVestingRevoked');
            });
            it('returns vesting params: revoked', async () => {
                expect((await vestingContract.revoked(setup.tokens.primeToken.address)).toString()).to.equal('true');
            });
            it('it should fail on a second revoke', async () => {
                await expectRevert(vestingContract.revoke(setup.tokens.primeToken.address, {from: owner}), 'TokenVesting: token already revoked');
            });
        });
    });
    context('vesting: non-revokable', () => {
        context('» parameters are valid: non-revokable contract', async () => {
            it('it should create a non-revokable vesting contract', async () => {
                owner = accounts[0];
                beneficiary = accounts[2];
                start = await time.latest();
                let tx = await setup.vesting.factory.create(owner, beneficiary, start, setup.vesting.params.cliffDuration, setup.vesting.params.duration, false);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.vesting.factory, 'VestingCreated');
                vestingAddress = setup.data.tx.logs[0].args.vestingContractAddress;
                nonrevokableVestingContract = await TokenVesting.at(vestingAddress);
            });
            it('it should not revoke', async () => {
                await expectRevert(
                    nonrevokableVestingContract.revoke(setup.tokens.primeToken.address, {from: owner}),
                    'TokenVesting: cannot revoke'
                );
            });
        });
    });
    context('vesting: edgecases - timestamp < _cliff', () => {
        context('» timestamp < _cliff', async () => {
            it('it should create a vesting contract', async () => {
                owner = accounts[0];
                beneficiary = accounts[3];
                start = await time.latest();
                let tx = await setup.vesting.factory.create(owner, beneficiary, start, 152000, setup.vesting.params.duration, setup.vesting.params.revocable);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.vesting.factory, 'VestingCreated');
                vestingAddress = setup.data.tx.logs[0].args.vestingContractAddress;
                tokenVestAmount = toWei('100000');
                await setup.tokens.primeToken.transfer(vestingAddress, tokenVestAmount);
                expect((await setup.tokens.primeToken.balanceOf(vestingAddress)).toString()).to.equal(tokenVestAmount.toString());
            });
            it('reverts', async () => {
                await expectRevert(
                    vestingContract.release(setup.tokens.primeToken.address, {from: beneficiary}),
                    "TokenVesting: no tokens are due"
                );
            });
        });
    });
    context('vesting: edgecases - block.timestamp >= _start.add(_duration) || _revoked[address(token)]', () => {
        context('» block.timestamp >= _start.add(_duration) || _revoked[address(token)]', async () => {
            it('it should create a vesting contract', async () => {
                owner = accounts[0];
                beneficiary = accounts[4];
                start = await time.latest();
                let tx = await setup.vesting.factory.create(owner, beneficiary, start, 100000, setup.vesting.params.duration, setup.vesting.params.revocable);
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, setup.vesting.factory, 'VestingCreated');
                vestingAddress = setup.data.tx.logs[0].args.vestingContractAddress;
                tokenVestAmount = toWei('100000');
                await setup.tokens.primeToken.transfer(vestingAddress, tokenVestAmount);
                expect((await setup.tokens.primeToken.balanceOf(vestingAddress)).toString()).to.equal(tokenVestAmount.toString());
            });
            it('reverts', async () => {
                await expectRevert(
                    vestingContract.release(setup.tokens.primeToken.address, {from: beneficiary}),
                    "TokenVesting: no tokens are due"
                );
            });
        });
    });
});
