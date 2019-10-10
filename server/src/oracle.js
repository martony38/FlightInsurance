const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

// Taken from https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve#36481059
// Standard Normal variate using Box-Muller transform.
function randn_bm() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
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
    try {
      await submitOracleResponse(
        index,
        airline,
        flight,
        timestamp,
        this.getRandomStatusCode()
      ).send({ from: this.address, gas: estimatedGas * 2 });
    } catch (error) {
      //console.log("error", error);
    }
  }

  getRandomStatusCode() {
    const distribution = randn_bm();

    if (Math.abs(distribution) < 0.6) {
      return STATUS_CODE_ON_TIME;
    }

    if (Math.abs(distribution) < 1.1) {
      return STATUS_CODE_LATE_AIRLINE;
    }

    if (Math.abs(distribution) < 1.3) {
      return STATUS_CODE_LATE_WEATHER;
    }

    if (Math.abs(distribution) < 1.5) {
      return STATUS_CODE_LATE_TECHNICAL;
    }

    if (Math.abs(distribution) < 2) {
      return STATUS_CODE_LATE_OTHER;
    }

    return STATUS_CODE_UNKNOWN;
  }
}
