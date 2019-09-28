export default class Oracle {
  constructor(address, appContract) {
    this.address = address;
    this.app = appContract;
  }

  async register() {
    const { registerOracle, getMyIndexes, REGISTRATION_FEE } = this.app.methods;
    const fee = await REGISTRATION_FEE().call({ from: this.address });

    // Estimate gas cost of registerOracle transaction then
    // set the gas limit to twice that amount
    const estimatedGas = await registerOracle().estimateGas({
      from: this.address,
      value: fee
    });
    await registerOracle().send({
      from: this.address,
      value: fee,
      gas: estimatedGas * 2
    });

    this.indexes = await getMyIndexes().call({ from: this.address });

    // Add event listener for oracle requests filtered by index
    this.app.events.OracleRequest(
      { fromBlock: 0, filter: { index: this.indexes } },
      this.handleRequest.bind(this)
    );
  }

  async handleRequest(error, event) {
    if (error) {
      return;
    }

    const { index, airline, flight, timestamp } = event.returnValues;
    const { submitOracleResponse } = this.app.methods;

    // Estimate gas cost of registerOracle transaction then
    // set the gas limit to twice that amount
    const estimatedGas = await submitOracleResponse(
      index,
      airline,
      flight,
      timestamp,
      this.getRandomStatusCode()
    ).estimateGas({ from: this.address });
    await submitOracleResponse(
      index,
      airline,
      flight,
      timestamp,
      this.getRandomStatusCode()
    ).send({ from: this.address, gas: estimatedGas * 2 });
  }

  getRandomStatusCode() {
    return Math.floor(Math.random() * 6) * 10;
  }
}
