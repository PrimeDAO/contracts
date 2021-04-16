/*global artifacts, web3, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const BPool = artifacts.require('BPool');
const bigInt = require('big-integer');

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
    // deploy vesting
    setup.vesting = await helpers.setup.vesting(setup);
    // deploy farmFactory
    setup.farmFactory = await helpers.setup.farmFactory(setup);
    // deploy primeDAO governance
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('BalancerMulticall', (accounts) => {
    let setup;
    let publicSwap;
    let swapFee;
    let blockNumber;
    let newWeights;
    let newWeight;
    let startBLock;
    let endBlock;
    let token;
    let poolAmountOut;
    let poolAmountIn;
    let maxAmountsIn;
    let minAmountsOut;

    before('!! deploy setup', async () => {
        setup = await deploy(accounts);
    });
    context('# setPublicSwap', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                publicSwap = false;
            });
            context('» pauses the contract by changing setPublicSwap', () => {
                it('bPool.isPublicSwap() == publicSwap', async () => {
                    const calldata = helpers.encodeSetPublicSwap(publicSwap);
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    //store data
                    setup.data.tx = tx;

                    const pool = await setup.balancer.pool.bPool();
                    const bPool = await BPool.at(pool);

                    expect(await bPool.isPublicSwap()).to.equal(publicSwap);
                });
            });
        });
    });
    context('# setSwapFee', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                swapFee = 11 ** 15;
            });
            context('» change swapFee', () => {
                it('bPool.getSwapFee() == swapFee', async () => {
                    const calldata = helpers.encodeSetSwapFee(swapFee);
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    //store data
                    setup.data.tx = tx;

                    const pool = await setup.balancer.pool.bPool();
                    const bPool = await BPool.at(pool);
                    expect(await (await bPool.getSwapFee()).toString()).to.equal(swapFee.toString());
                });
            });
        });
    });
    context('# commitAddToken => applyAddToken => removeToken', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
            });

            context('» commit Add Token', () => {
                it('commit add Token', async () => {
                    const calldata_commitAddToken = helpers.encodeCommitAddToken(setup.tokens.erc20s[2].address, toWei('1000'), toWei('1'));
                    const calldata_reset = helpers.encodeApprove(setup.balancer.pool.address, 0);
                    const calldata_approve = helpers.encodeApprove(setup.balancer.pool.address, toWei('1000'));
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address,setup.tokens.erc20s[2].address, setup.tokens.erc20s[2].address],[calldata_commitAddToken, calldata_reset, calldata_approve],[0,0,0], constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    //store data
                    setup.data.tx = tx;
                });
                context('» applyAddToken', () => {
                    it('checks that the right address is commited', async () => {
                        expect((await setup.balancer.pool.newToken()).addr).to.equal(setup.tokens.erc20s[2].address);
                    });
                    it('checks allowance of balancer pool provided by avatar', async () => {
                        expect((await setup.tokens.erc20s[2].allowance(setup.organization.avatar.address, setup.balancer.pool.address)).toString()).to.equal(toWei('1000'));
                    });
                    it('transfer tokens to the avatar address', async () => {
                        await setup.tokens.erc20s[2].transfer(setup.organization.avatar.address, toWei('1000'));
                    });
                    it('advances to blockNumber + 11', async () => {
                        blockNumber = (await setup.balancer.pool.newToken()).commitBlock;
                        await time.advanceBlockTo(blockNumber.toNumber()+11);
                    });
                    it('apply add Token', async () => {
                        const calldata = helpers.encodeApplyAddToken();
                        const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                        const proposalId = helpers.getNewProposalId(_tx);
                        await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                        const tx = await setup.primeDAO.multicallScheme.execute(proposalId);


                        setup.data.tx = tx;
                    });
                    it('checks the balance of bPool', async () => {
                        expect((await setup.tokens.erc20s[2].balanceOf(await setup.balancer.pool.bPool())).toString()).to.equal(toWei('1000'));
                    });
                    it('checks the number of tokens', async () => {
                        const pool = await setup.balancer.pool.bPool();
                        const bPool = await BPool.at(pool);
                        expect((await bPool.getNumTokens()).toNumber()).to.equal(4);
                    });
                    context('» removeToken', () => {
                        context('» remove Token', () => {
                            it('removes Token', async () => {
                                const calldata = helpers.encodeRemoveToken(setup.tokens.erc20s[2].address);
                                const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                                const proposalId = helpers.getNewProposalId(_tx);
                                await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                                const tx = await setup.primeDAO.multicallScheme.execute(proposalId);

                                setup.data.tx = tx;
                            });
                            it('checks the number of tokens', async () => {
                                const pool = await setup.balancer.pool.bPool();
                                const bPool = await BPool.at(pool);
                                expect((await bPool.getNumTokens()).toNumber()).to.equal(3);
                            });
                            it('checks the balance of bPool', async () => {
                                expect((await setup.tokens.erc20s[2].balanceOf(await setup.balancer.pool.bPool())).toString()).to.equal('0');
                            });
                        });
                    });
                });
            });
        });
    });
    context('# updateWeight', async () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                newWeight = toWei('1.5');
                token = setup.tokens.erc20s[1];
            });
            context('» updateWeight', async () => {
                before('!! tokens to avatar', async () => {
                    // transfer tokens to avatar
                    await token.transfer(setup.organization.avatar.address, toWei('10000'));
                });
                it('updates weight', async () => {
                    const uint256_max_value = (bigInt(2).pow(256).minus(1)).toString();
                    const calldata_update = helpers.encodeUpdateWeight(token.address, newWeight);
                    const calldata_reset = helpers.encodeApprove(setup.balancer.pool.address, 0);
                    const calldata_approve = helpers.encodeApprove(setup.balancer.pool.address, uint256_max_value);
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                        [token.address, token.address, setup.balancer.pool.address, token.address],
                        [calldata_reset, calldata_approve, calldata_update, calldata_reset],
                        [0,0,0,0],
                        constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    // store data
                    setup.data.tx = tx;
                });
            });
        });
    });
    context('# updateWeightsGradually', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                newWeights = [toWei('2'), toWei('4'), toWei('4')];
                startBLock = blockNumber.toNumber()+100;
                endBlock = startBLock + 250;
            });
            context('» call updateWeightsGradually', () => {
                it('update weights gradually', async () => {
                    const calldata = helpers.encodeUpdateWeightsGradually(newWeights, startBLock, endBlock);
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    //store data
                    setup.data.tx = tx;
                });
            });
        });
    });
    context('# joinPool => exitPool: token require statement checks', () => {
        context(' generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                poolAmountOut = toWei('500');
                poolAmountIn = toWei('250');
                maxAmountsIn = [toWei('7000'), toWei('3000'), toWei('3000')];
                minAmountsOut = [toWei('2000'), toWei('1000'), toWei('1000')];
            });

            context('» exitPool: not enough tokens', () => {
                before('!! joinpool', async () => {
                    const calldata = helpers.encodeJoinPool(poolAmountOut, maxAmountsIn);
                    const pool = await  setup.balancer.pool.bPool();
                    const bPool = await BPool.at(pool);
                    const bPoolTokens = await bPool.getCurrentTokens();
                    expect(bPoolTokens.length).to.equal(maxAmountsIn.length);
                    let token_addresses = [];
                    let token_calldatas = [];
                    let token_vals = [];
                    for (let i = 0; i< maxAmountsIn.length; i++) {
                        token_addresses.push(bPoolTokens[i], bPoolTokens[i]);
                        token_vals.push(0,0);
                        token_calldatas.push(
                            helpers.encodeApprove(setup.balancer.pool.address,0),
                            helpers.encodeApprove(setup.balancer.pool.address,maxAmountsIn[i])
                        );
                    }
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                        token_addresses.concat([setup.balancer.pool.address]),
                        token_calldatas.concat([calldata]),
                        token_vals.concat([0]),
                        constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    // store data
                    setup.data.tx = tx;
                    expect((await setup.balancer.pool.balanceOf(setup.organization.avatar.address)).toString()).to.equal(poolAmountOut);
                });

            });
        });
    });
    context('# joinPool => exitPool', () => {
        context('» generics', () => {
            before('!! deploy setup', async () => {
                setup = await deploy(accounts);
                poolAmountOut = toWei('500');
                poolAmountIn = toWei('250');
                maxAmountsIn = [toWei('7000'), toWei('3000'), toWei('3000')];
                minAmountsOut = [toWei('2000'), toWei('1000'), toWei('1000')];
            });
            context('» call joinPool', () => {
                it('transfers tokens to the avatar address', async () => {
                    await setup.tokens.primeToken.transfer(setup.organization.avatar.address, maxAmountsIn[0]);
                    await setup.tokens.erc20s[0].transfer(setup.organization.avatar.address, maxAmountsIn[1]);
                    await setup.tokens.erc20s[1].transfer(setup.organization.avatar.address, maxAmountsIn[2]);
                });
                it('joins pool', async () => {
                    const calldata = helpers.encodeJoinPool(poolAmountOut, maxAmountsIn);
                    const pool = await  setup.balancer.pool.bPool();
                    const bPool = await BPool.at(pool);
                    const bPoolTokens = await bPool.getCurrentTokens();
                    expect(bPoolTokens.length).to.equal(maxAmountsIn.length);
                    let token_addresses = [];
                    let token_calldatas = [];
                    let token_vals = [];
                    for (let i = 0; i< maxAmountsIn.length; i++) {
                        token_addresses.push(bPoolTokens[i], bPoolTokens[i]);
                        token_vals.push(0,0);
                        token_calldatas.push(
                            helpers.encodeApprove(setup.balancer.pool.address,0),
                            helpers.encodeApprove(setup.balancer.pool.address,maxAmountsIn[i])
                        );
                    }
                    const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                        token_addresses.concat([setup.balancer.pool.address]),
                        token_calldatas.concat([calldata]),
                        token_vals.concat([0]),
                        constants.ZERO_BYTES32);
                    const proposalId = helpers.getNewProposalId(_tx);
                    await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                    const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                    // store data
                    setup.data.tx = tx;
                });
                it('checks the balanceOf BPRIME tokens', async () => {
                    expect((await setup.balancer.pool.balanceOf(setup.organization.avatar.address)).toString()).to.equal(poolAmountOut);
                });
                context('» call exitPool', () => {
                    it('exits pool', async () => {
                        const calldata = helpers.encodeExitPool(poolAmountIn, minAmountsOut);
                        const _tx = await setup.primeDAO.multicallScheme.proposeCalls([setup.balancer.pool.address],[calldata], [0], constants.ZERO_BYTES32);
                        const proposalId = helpers.getNewProposalId(_tx);
                        await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                        const tx = await setup.primeDAO.multicallScheme.execute(proposalId);
                        // store data
                        setup.data.tx = tx;
                    });
                    it('checks the balanceOf BPRIME tokens', async () => {
                        expect((await setup.balancer.pool.balanceOf(setup.organization.avatar.address)).toString()).to.equal(poolAmountIn);
                    });
                });
            });
        });
    });
});
