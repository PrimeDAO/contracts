# PrimeDAO contracts package

> 🤖 PrimeDAO Smart contracts

This repo contains the smart contracts making up PrimeDAO, the mission of which is to [facilitate wide adoption of open finance by coordinating and cultivating projects that promote safety, reliability, liquidity, and open access](https://docs.primedao.io/primedao/intro).

`/contracts/` is organized as follows:
- `/contracts/incentives/` contains the `StakingRewards` contract for the [PrimeDAO liquidity mining](https://github.com/PrimeDAO/liquidity-mining) scheme. This is a fork of the [StakingRewards](https://github.com/Synthetixio/synthetix/blob/develop/contracts/StakingRewards.sol) contract developed by [Synthetix](https://github.com/Synthetixio/synthetix) with few adjustments made to best suit PrimeDAO's needs.
- `/contracts/schemes/` contains the `BalancerProxy` contract, the Configurable Rights Pool proxy for the Prime [Balancer Pool](https://pools.balancer.exchange/#/pool/0xdd0b69d938c6e98bf8f16f04c4913a0c07e0bb6e/). This is a heavily modified fork of the [ConfigurableRightsPool](https://github.com/balancer-labs/configurable-rights-pool/blob/master/contracts/ConfigurableRightsPool.sol) contract developed by [Balancer Labs](https://github.com/balancer-labs/configurable-rights-pool), adjusted so that ownership and control of the Balancer Pool can be passed to PrimeDAO at the end of the PrimeDAO [Incubation stage](https://docs.primedao.io/primedao/roadmap#incubation).
- `/contracts/utils/` contains interfaces for the ConfigurableRightsPool and BPool contracts.
- `/contracts/vesting/` contains contracts for the [token vesting scheme](https://docs.primedao.io/primedao/tokenomics/roles-and-rewards/vesting-contract-guide).
- `/contracts/PrimeToken.sol` is PrimeDAO's native utility and reward token, [PRIME](https://etherscan.io/address/0xE59064a8185Ed1Fca1D17999621eFedfab4425c9). You can read more about Prime's tokenomics [here](https://docs.primedao.io/primedao/tokenomics). 

## Development

To install node modules

```
npm i
```

To compile contract

```
truffle compile
```

To run tests

```
npm run test
```

To run coverage

```
npm run coverage
```

### Deploy DAO to kovan

prepare `.env` file and add your config variables, it should look as follows:
```
NETWORK=kovan
PROVIDER=https://kovan.infura.io/v3/your-infura-provider-key
KEY=your-private-key
```

deploy external contracts
```
npm run deploy:contracts:kovan
```

### Setup deployed contracts on kovan

create configurable rights pool
```
npm run setup:pool:create:kovan
```

transfer ownership of crpool to dao
```
npm run setup:pool:transfer:kovan
```

initialize staking rewards contract  
```
npm run setup:staking:innit:kovan
```

notify reward amount in staking contract
```
npm run setup:staking:confirm:kovan
```

set up price oracle
```
npm run setup:oracle:kovan
```

## Contributing to PrimeDAO
If you wish to contribute to PrimeDAO, check out our [Contributor Onboarding documentation](https://docs.primedao.io/primedao/call-for-contributors).

## License
```
Copyright 2020 Prime Foundation

Licensed under the GNU General Public License v3.0.
You may obtain a copy of this license at:

  https://www.gnu.org/licenses/gpl-3.0.en.html

```
