# Flight Insurance DApp

This project is divided in 3 parts:

- [Smart contracts](./smart-contracts/README.md)
- [Oracle and API server](./server/README.md)
- [Frontend](./frontend/README.md)

## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (with npm)
- [Ember CLI](https://ember-cli.com/)
- [Google Chrome](https://google.com/chrome/)
- [Truffle](https://www.trufflesuite.com/docs/truffle/getting-started/installation)
- [Ganache CLI](https://github.com/trufflesuite/ganache-cli/blob/master/README.md)

## Running / Development

1. Launch local ethereum network instance

```bash
cd smart-contracts

ganache-cli -m "<YOUR_MNEMONIC_HERE>" -a 35 -e 200 --gasLimit 18000000
```

2. Compile and deploy contracts

```bash
cd smart-contracts

truffle compile

truffle deploy
```

3. Start oracles and API server

```bash
cd server

npm run server
```

4. Start wep app

```bash
cd frontend

npm run dapp
```

5. Open chrome and visit [http://localhost:8000](http://localhost:8000).
