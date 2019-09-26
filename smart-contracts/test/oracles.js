const Test = require("./testConfig.js");

contract("Oracles", async accounts => {
  const TEST_ORACLES_COUNT = 20;

  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  let config,
    dataContract,
    appContract,
    flight,
    timestamp,
    airline,
    key,
    passenger;

  before("setup contract", async () => {
    config = await Test.Config(accounts);
    ({ flightSuretyData: dataContract, flightSuretyApp: appContract } = config);
    fee = await appContract.REGISTRATION_FEE();
    await dataContract.authorizeContract(appContract.address);
    await appContract.addAirline(accounts[1]);
    await appContract.fund({
      from: accounts[1],
      value: web3.utils.toWei("10")
    });
    flight = "ND1309"; // Course number
    timestamp = Math.floor(Date.now() / 1000);
    airline = accounts[1];
    key = web3.utils.hexToBytes(
      web3.utils.soliditySha3(airline, flight, timestamp)
    );
    passenger = accounts[6];
    await appContract.registerFlight(flight, timestamp, { from: airline });
    await appContract.purchaseInsurance(key, {
      from: passenger,
      value: web3.utils.toWei("0.5")
    });
  });

  it("can register oracles", async () => {
    for (let a = 0; a < TEST_ORACLES_COUNT; a++) {
      await appContract.registerOracle({
        from: accounts[a + 10],
        value: fee
      });
      const result = await appContract.getMyIndexes({
        from: accounts[a + 10]
      });
      console.log(
        `Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`
      );
    }
  });

  it("can request flight status", async () => {
    // Submit a request for oracles to get status information for a flight
    await appContract.fetchFlightStatus(airline, flight, timestamp);

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for (let a = 0; a < TEST_ORACLES_COUNT; a++) {
      // Get oracle information
      const oracleIndexes = await appContract.getMyIndexes({
        from: accounts[a + 10]
      });
      for (let idx = 0; idx < 3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await appContract.submitOracleResponse(
            oracleIndexes[idx],
            airline,
            flight,
            timestamp,
            STATUS_CODE_LATE_AIRLINE,
            { from: accounts[a + 10] }
          );
        } catch (e) {
          // Enable this when debugging
          /*
          console.log(
            "\nError",
            idx,
            oracleIndexes[idx].toNumber(),
            flight,
            timestamp
          );
          */
        }
      }
    }

    const statusCode = await dataContract.getStatus(key, {
      from: appContract.address
    });
    assert.equal(statusCode, STATUS_CODE_LATE_AIRLINE);
  });

  it("If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid", async function() {
    await appContract.claim(key, { from: passenger });

    let balance = await dataContract.checkBalance(passenger, {
      from: appContract.address
    });
    assert.equal(
      balance,
      web3.utils.toWei("0.75"),
      "Passenger could not check balance"
    );

    balance = await appContract.checkBalance({ from: passenger });
    assert.equal(
      balance,
      web3.utils.toWei("0.75"),
      "Passenger could not check balance"
    );
  });

  it("Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout", async function() {
    let initialBalance = await web3.eth.getBalance(passenger);
    initialBalance = new web3.utils.BN(initialBalance);
    let balance = await appContract.checkBalance({ from: passenger });

    await appContract.withdraw({
      from: passenger,
      gasPrice: 0
    });

    let finalBalance = await web3.eth.getBalance(passenger);
    finalBalance = new web3.utils.BN(finalBalance);

    const diff = finalBalance.sub(initialBalance);
    assert.equal(
      diff.toString(),
      web3.utils.toWei("0.75"),
      "Balance not transfered to passenger"
    );

    balance = await appContract.checkBalance({ from: passenger });
    assert.equal(balance, 0, "Passenger could not check balance");
  });
});
