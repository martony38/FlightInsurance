# Flight Insurance Smart Contracts

Smart contracts for the Flight Insurance DApp.

## Prerequisites

You will need the following things properly installed on your computer.

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (with npm)
- [Truffle](https://www.trufflesuite.com/docs/truffle/getting-started/installation)
- [Ganache CLI](https://github.com/trufflesuite/ganache-cli/blob/master/README.md)

## Installation

- `git clone` this repository
- `cd smart-contracts`
- `npm install`

## Running / Development / Tests

- Launch local network instance:

```bash
ganache-cli -m "<YOUR_MNEMONIC_HERE>" -a 35 -e 200 --gasLimit 18000000
```

- `truffle test` to run the tests suite

## Deploy Contracts

- `truffle deploy` (retry this command if one of the contract fails to deploy on first try)
