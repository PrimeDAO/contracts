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
    // deploy primeDAO governance
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('StakingRewards', (accounts) => {
    let setup;
    let stakeAmount;
    let halfStake;
    let rewardAmount;
    let _initreward = (BigInt(925 * 100 * 1000000000000000000)).toString(); // "92500000000000003145728"
    let _starttime = 1600560000; // 2020-09-20 00:00:00 (UTC +00:00)
    let _durationDays = 7;
    let initTime;
    let _badReward;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });
    context('» contract is not initialized yet', () => {
        context('» parameters are valid', () => {
            before('!! fund contract', async () => {
                await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
            });
            it('it initializes contract', async () => {
                await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
            });
        });
        context('» deploying account is owner', () => {
            it('returns correct owner', async () => {
                expect(accounts[0]).to.equal(await setup.incentives.stakingRewards.owner());
            });
        });
        context('» periodFinish == 0 on deployment', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it(' == 0', async () => {
                expect((await setup.data.incentives.periodFinish()).toNumber()).to.equal(0);
            });
        });
        context('» reward token parameter is not valid', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(constants.ZERO_ADDRESS, setup.balancer.pool.address, _initreward, _starttime, _durationDays), 'StakingRewards: rewardToken cannot be null');
            });
        });
        context('» staking token parameter is not valid', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, constants.ZERO_ADDRESS, _initreward, _starttime, _durationDays), 'StakingRewards: stakingToken cannot be null');
            });
        });
        context('» _initreward parameter is not valid: 0', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, 0, _starttime, _durationDays), 'StakingRewards: initreward cannot be null');
            });
        });
        context('» _starttime parameter is not valid: 0', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, 0, _durationDays), 'StakingRewards: starttime cannot be null');
            });
        });
        context('» _durationDays parameter is not valid: 0', () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, 0), 'StakingRewards: duration cannot be null');
            });
        });
        context('» contract is not properly funded before initialization: 0 funding', async () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
            });
            it('it reverts', async () => {
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays), 'StakingRewards: wrong reward amount supplied');
            });
        });
        context('» contract is not properly funded before intialization: wrong amount', async () => {
            before('!! deploy contract', async () => {
                setup.data.incentives = await StakingRewards.new();
                _badReward = (BigInt(924.9 * 100 * 1000000000000000000)).toString();
            });
            it('it reverts', async () => {
                await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _badReward);
                await expectRevert(setup.data.incentives.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays), 'StakingRewards: wrong reward amount supplied');
            });
        });
    });
    context('» contract is already initialized', () => {
        // contract has already been initialized during setup
        it('it reverts', async () => {
            await expectRevert(setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays), 'StakingRewards: contract already initialized');
        });
    });
    context('# stake', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
            });
            context('» contract is not initialized', () => {
                before('!! deploy contract', async () => {
                    setup.data.incentives = await StakingRewards.new();
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.data.incentives.stake(stakeAmount),
                        'StakingRewards: contract not initialized'
                    );
                });
            });
            context('» stake parameter is not valid', () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.stake(toWei('0')),
                        'StakingRewards: cannot stake 0'
                    );
                });
            });
            context('» stake parameter is valid: stakes tokens', () => {
                before('!! fund accounts', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
                it('stakes', async () => {
                    let tx = await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'Staked'); //tx # , contract, event (as string)
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(stakeAmount);
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(toWei('0'));
                });
            });
        });
    });
    context('# withdraw', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                halfStake = toWei('50');
            });
            context('» contract is not initialized', () => {
                before('!! deploy contract', async () => {
                    setup.data.incentives = await StakingRewards.new();
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.data.incentives.stake(stakeAmount),
                        'StakingRewards: contract not initialized'
                    );
                });
            });
            context('» withdraw parameter is not valid: too low', () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.withdraw(toWei('0')),
                        'StakingRewards: Cannot withdraw 0'
                    );
                });
            });
            context('» withdraw parameter is valid: withdraws entire stake', () => {
                before('!! fund accounts and stake', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                });
                it('withdraws', async () => {
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(stakeAmount);
                    let tx = await setup.incentives.stakingRewards.withdraw(stakeAmount, { from: accounts[1] });
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'Withdrawn');
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                });
            });
            context('» withdraw parameter is valid: withdraws some of stake', () => {
                before('!! repopulate account and stake', async () => {
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                });
                it('withdraws', async () => {
                    let tx = await setup.incentives.stakingRewards.withdraw(halfStake, { from: accounts[1] });
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'Withdrawn');
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(halfStake);
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(halfStake);
                });
            });
        });
    });
    context('# getReward', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» contract is not initialized', () => {
                before('!! deploy contract', async () => {
                    setup.data.incentives = await StakingRewards.new();
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.data.incentives.getReward( { from: accounts[1] }),
                        'StakingRewards: contract not initialized'
                    );
                });
            });
            context('» getReward param valid: rewards 0', async () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('rewards 0', async () => {
                    expect((await setup.incentives.stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                    await setup.incentives.stakingRewards.getReward( { from: accounts[1]} );
                    expect((await setup.incentives.stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                });
            });
            context('» getReward param valid: rewards', async () => {
                before('!! fund accounts', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                    expect((await setup.tokens.primeToken.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(_initreward);
                    await setup.tokens.primeToken.approve(accounts[1], rewardAmount);
                });
                it('rewards after time period', async () => {
                    /* not staked - no reward earned */
                    expect((await setup.incentives.stakingRewards.earned(accounts[1])).toString()).to.equal(toWei('0'));
                    /* stake */
                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    /* fast-forward 1 week */
                    await time.increase(time.duration.weeks(1));
                    let earned = BigInt(await setup.incentives.stakingRewards.earned(accounts[1]));
                    let tx = await setup.incentives.stakingRewards.getReward( { from: accounts[1] } );
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'RewardPaid');
                    let balance = BigInt(await setup.tokens.primeToken.balanceOf(accounts[1]));
                    expect(earned).to.equal(balance);
                });
            });
        });
    });
    context('# exit', async () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                halfStake = toWei('50');
                rewardAmount = toWei('100');
            });
            context('» contract is not initialized', () => {
                before('!! deploy contract', async () => {
                    setup.data.incentives = await StakingRewards.new();
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.data.incentives.exit(),
                        'StakingRewards: contract not initialized'
                    );
                });
            });
            context('» cannot exit with 0', async () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('cannot exit with no funds', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.exit( {from: accounts[1] }),
                        'StakingRewards: Cannot withdraw 0.'
                    );
                });
            });
            context('» it exits successfully', () => {
                before('!! fund accounts and stake', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                });
                it('exits successfully where reward is 0', async () => {
                    let tx = await setup.incentives.stakingRewards.exit( {from: accounts[1] });
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'Withdrawn');
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
                it('exits successfully where reward is > 0', async () => {
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, rewardAmount);
                    await setup.tokens.primeToken.approve(accounts[1], rewardAmount);

                    await setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] });
                    await time.increase(time.duration.weeks(1));

                    let rewardEarned = BigInt(await setup.incentives.stakingRewards.earned(accounts[1]));
                    let tx = await setup.incentives.stakingRewards.exit( {from: accounts[1] });
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'Withdrawn');
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.incentives.stakingRewards, 'RewardPaid');
                    let balance = BigInt(await setup.tokens.primeToken.balanceOf(accounts[1]));
                    expect(rewardEarned).to.equal(balance);
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
            });
        });
    });
    context('# rescueTokens', async () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» contract is not initialized', () => {
                before('!! deploy contract', async () => {
                    setup.data.incentives = await StakingRewards.new();
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.data.incentives.rescueTokens(setup.tokens.erc20s[0].address, stakeAmount, accounts[1]),
                        'StakingRewards: contract not initialized'
                    );
                });
            });
            context('» rescueTokens token parameter is not valid: governance', () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('it reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.rescueTokens(setup.tokens.erc20s[0].address, stakeAmount, accounts[1], { from: accounts[1]} ),
                        'StakingRewards: !governance'
                    );
                });
            });
            context('» rescueTokens token parameter is not valid: rewardToken', () => {
                it('it reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.rescueTokens(setup.tokens.primeToken.address, stakeAmount, accounts[1]),
                        'StakingRewards: rewardToken'
                    );
                });
            });
            context('» rescueTokens token parameter is not valid: stakingToken', () => {
                it('it reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.rescueTokens(setup.balancer.pool.address, stakeAmount, accounts[1]),
                        'StakingRewards: stakingToken'
                    );
                });
            });
            context('» rescueTokens valid: rescues tokens', () => {
                before('!! fund contracts', async () => {
                    await setup.tokens.erc20s[0].transfer(setup.incentives.stakingRewards.address, stakeAmount);
                });
                it('rescues', async () => {
                    await setup.incentives.stakingRewards.rescueTokens(setup.tokens.erc20s[0].address, stakeAmount, accounts[1]);
                    expect((await setup.tokens.erc20s[0].balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await setup.tokens.erc20s[0].balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
            });
        });
    });
    context('# lastTimeRewardApplicable', async () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» lastTimeRewardApplicable returns smallest of timestamp & periodFinish', async () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                    initTime = await time.latest();
                });
                it('returns block.timestamp', async () => {
                    let ltra = (await setup.incentives.stakingRewards.lastTimeRewardApplicable()).toNumber();
                    expect(ltra).to.equal(initTime.toNumber());
                });
            });
        });
    });
    context('# checkstart modifier', () => {
        context('» generics', () => {
            before('!! deploy setup & initialize contract', async () => {
                let _badStart = ((await time.latest()).toNumber()) + 100000;
                setup = await deploy(accounts);
                await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _badStart, _durationDays);
            });
            context('» block.timestamp >= starttime: stake', async () => {
                before('!! fund accounts', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                    expect((await setup.balancer.pool.balanceOf(setup.incentives.stakingRewards.address)).toString()).to.equal(toWei('0'));
                    expect((await setup.balancer.pool.balanceOf(accounts[1])).toString()).to.equal(stakeAmount);
                });
                it('reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.stake(stakeAmount, { from: accounts[1] }),
                        'StakingRewards: not start'
                    );
                });
            });
            context('» block.timestamp >= starttime: withdraw', async () => {
                before('!! fund accounts and stake', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });
                });
                it('reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.withdraw(stakeAmount, { from: accounts[1] }),
                        'StakingRewards: not start'
                    );
                });
            });
            context('» block.timestamp >= starttime: exit', async () => {
                it('reverts', async () => {
                    await expectRevert(
                        setup.incentives.stakingRewards.exit({ from: accounts[1] }),
                        'StakingRewards: not start'
                    );
                });
            });
        });
    });
    context('# balanceOf', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» balanceOf', async () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('returns the staked balance of an account when stake == 0', async () => {
                    let stakingBal = await setup.incentives.stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal('0');
                });
                it('returns the staked balance of an account when staked', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });

                    await setup.incentives.stakingRewards.stake(stakeAmount, {from: accounts[1]});
                    let stakingBal = await setup.incentives.stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal(stakeAmount);
                });
                it('updates balance when account withdraws', async () => {
                    await setup.incentives.stakingRewards.withdraw(stakeAmount, { from: accounts[1] });
                    let stakingBal = await setup.incentives.stakingRewards.balanceOf(accounts[1]);
                    expect(stakingBal.toString()).to.equal('0');
                });
            });
        });
    });
    context('# totalSupply', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                stakeAmount = toWei('100');
                rewardAmount = toWei('100');
            });
            context('» totalSupply', async () => {
                before('!! fund & initialize contract', async () => {
                    await setup.tokens.primeToken.transfer(setup.incentives.stakingRewards.address, _initreward);
                    await setup.incentives.stakingRewards.initialize(setup.tokens.primeToken.address, setup.balancer.pool.address, _initreward, _starttime, _durationDays);
                });
                it('_totalSupply == 0 before staking occurs', async () => {
                    let initialSupply = await setup.incentives.stakingRewards.totalSupply();
                    expect(initialSupply.toString()).to.equal('0');
                });
                it('updates when user stakes', async () => {
                    await setup.balancer.pool.transfer(accounts[1], stakeAmount);
                    await setup.balancer.pool.approve(setup.incentives.stakingRewards.address, stakeAmount, { from: accounts[1] });

                    await setup.incentives.stakingRewards.stake(stakeAmount, {from: accounts[1]});
                    let totalSupply = await setup.incentives.stakingRewards.totalSupply();
                    expect(totalSupply.toString()).to.equal(stakeAmount);
                });
                it('updates when user withdraws', async () => {
                    await setup.incentives.stakingRewards.withdraw(stakeAmount, { from: accounts[1] });
                    let totalSupply = await setup.incentives.stakingRewards.totalSupply();
                    expect(totalSupply.toString()).to.equal('0');
                });
            });
        });
    });
});
