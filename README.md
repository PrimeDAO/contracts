[![banner](https://i.ibb.co/BqjcRGG/Prime-DAO-Github-Contracts-Banner.png)](https://primedao.eth.link/#/)

[![<ORG_NAME>](https://circleci.com/gh/PrimeDAO/contracts.svg?style=svg)](https://app.circleci.com/pipelines/github/PrimeDAO)
[![codecov](https://codecov.io/gh/PrimeDAO/contracts/branch/main/graph/badge.svg?token=BG6I17TXEL)](https://codecov.io/gh/PrimeDAO/contracts)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# 🤖 PrimeDAO Smart Contracts

This repo contains the smart contracts making up PrimeDAO.

`/contracts/` is organized as follows:

- `/contracts/schemes/`- contracts necessary for PrimeDAO functioning on DAOStack.
- `/contracts/incentives/`- contracts that enable PrimeDAO users to create new yield farming programs.
- `/contracts/seed/`- Prime Launch seed module contracts.
- `/contracts/utils/`- utility contracts.

## Development

requires 

```
node >= 12.16.2
npm >= 7.8.0
````

to install node modules

```
npm i
```

to compile run
```
npm run compile
```

to test
```
npm run test
```

to run coverage
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

deploy dao
```
npm run deploy:dao:kovan
```

### Setup deployed contracts on kovan

create configurable rights pool
```
npm run create:pool:kovan
```

initialize staking rewards contract  
```
npm run init:staking:kovan
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
