const Test = require("./testConfig.js");

contract("Flight Surety Tests", async function(accounts) {
  //console.log("accounts", accounts);
  let config, dataContract, appContract, fee;

  before("setup contract", async function() {
    config = await Test.Config(accounts);
    ({ flightSuretyData: dataContract, flightSuretyApp: appContract } = config);
    fee = await appContract.FUNDING_FEE();
    await dataContract.authorizeContract(appContract.address);
  });

  afterEach(async function() {
    // Unpause contracts if paused during tests
    let paused = await dataContract.paused();
    if (paused) {
      await dataContract.unpause();
    }
    paused = await appContract.paused();
    if (paused) {
      await appContract.unpause();
    }
  });

  describe("operational status control", function() {
    it(`(multiparty) has correct initial isOperational() value`, async function() {
      // Get operating status
      const status = await dataContract.paused();
      assert.equal(
        status,
        false,
        "Incorrect initial operating (paused) status value"
      );
    });

    it(`(multiparty) can block access to pause() for non-Contract Owner account`, async function() {
      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      let reason;
      try {
        await dataContract.pause({
          from: config.testAddresses[2]
        });
      } catch (error) {
        accessDenied = true;
        reason = error.reason;
      }
      assert.equal(
        accessDenied,
        true,
        "Access not restricted to Contract Owner"
      );
      assert.equal(
        reason,
        "PauserRole: caller does not have the Pauser role",
        "Access not restricted to Contract Owner"
      );
    });

    it(`(multiparty) can allow access to (un)pause() for Contract Owner account`, async function() {
      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try {
        await dataContract.pause();
      } catch (e) {
        accessDenied = true;
      }
      assert.equal(
        accessDenied,
        false,
        "Pause access not restricted to Contract Owner"
      );

      accessDenied = false;
      try {
        await dataContract.unpause();
      } catch (error) {
        accessDenied = true;
      }
      assert.equal(
        accessDenied,
        false,
        "Unpause access not restricted to Contract Owner"
      );
    });

    describe("When Data contract is paused (multiparty) can block access to functions:", function() {
      for (const { testedFunction, args } of [
        { testedFunction: "pause", args: [] },
        {
          testedFunction: "authorizeContract",
          args: "flightSuretyApp address"
        },
        {
          testedFunction: "deauthorizeContract",
          args: "flightSuretyApp address"
        },
        { testedFunction: "addAirline", args: [accounts[2]] },
        { testedFunction: "renounceAirline", args: [] },
        { testedFunction: "voteForAirline", args: [accounts[2], accounts[0]] },
        { testedFunction: "deleteAirlineVotes", args: [accounts[2]] },
        { testedFunction: "registerAirline", args: [accounts[2]] },
        { testedFunction: "deleteAirlineRegistration", args: [accounts[2]] },
        {
          testedFunction: "buy",
          args: [accounts[2], new Uint8Array(32), 1, 1]
        },
        {
          testedFunction: "creditInsuree",
          args: [new Uint8Array(32), accounts[2]]
        },
        { testedFunction: "pay", args: [accounts[2]] }
      ]) {
        it(`${testedFunction}`, async function() {
          await dataContract.pause();

          let reverted = false;
          let reason;
          try {
            const functionArgs =
              args === "flightSuretyApp address" ? [appContract.address] : args;
            await dataContract[testedFunction](...functionArgs);
          } catch (error) {
            reverted = true;
            reason = error.reason;
          }
          assert.equal(reverted, true, "Access not blocked for whenNotPaused");
          assert.equal(
            reason,
            "Pausable: paused",
            "Access not blocked for whenNotPaused"
          );
        });
      }
    });

    describe("When App contract is paused (multiparty) can block access to functions:", function() {
      for (const { testedFunction, args } of [
        { testedFunction: "pause", args: [] },
        { testedFunction: "fund", args: [] },
        { testedFunction: "addAirline", args: [accounts[2]] },
        { testedFunction: "registerFlight", args: ["test", 0] },
        {
          testedFunction: "purchaseInsurance",
          args: [new Uint8Array(32)]
        },
        { testedFunction: "fetchFlightStatus", args: [accounts[2], "test", 1] },
        { testedFunction: "registerOracle", args: [] },
        {
          testedFunction: "submitOracleResponse",
          args: [1, accounts[2], "test", 1, 1]
        }
      ]) {
        it(`${testedFunction}`, async function() {
          await appContract.pause();

          let reverted = false;
          let reason;
          try {
            await appContract[testedFunction](...args);
          } catch (error) {
            reverted = true;
            reason = error.reason;
          }
          assert.equal(reverted, true, "Access not blocked for whenNotPaused");
          assert.equal(
            reason,
            "Pausable: paused",
            "Access not blocked for whenNotPaused"
          );
        });
      }
    });
  });

  describe("Airlines", function() {
    it("Only an airline can add another Airline using addAirline()", async function() {
      const notAnAirline = accounts[1];
      const newAirline = accounts[2];

      let reason;
      let reverted = false;
      try {
        await appContract.addAirline(newAirline, {
          from: notAnAirline
        });
      } catch (error) {
        reverted = true;
        reason = error.reason;
      }

      assert.equal(
        reverted,
        true,
        "Airline should not be able to register another airline if it hasn't provided funding"
      );
      assert.equal(
        reason,
        "AirlineRole: caller does not have the Airline role",
        "Airline should not be able to register another airline if it hasn't provided funding"
      );
    });

    it("Airline can be registered, but does not participate in contract until it submits funding of 10 ether", async function() {
      const secondAirline = accounts[1];
      await appContract.addAirline(secondAirline);

      let isRegistered = await dataContract.isRegistered(secondAirline, {
        from: appContract.address
      });

      assert.equal(
        isRegistered,
        true,
        "Airline should be able to add a new airline"
      );

      let isAirline = await dataContract.isAirline(secondAirline, {
        from: appContract.address
      });

      assert.equal(
        isAirline,
        false,
        "Unfunded airline should not have airline role"
      );

      await appContract.fund({ from: secondAirline, value: fee });

      isAirline = await dataContract.isAirline(secondAirline, {
        from: appContract.address
      });

      assert.equal(isAirline, true, "Funded airline should have airline role");
    });

    it("Only existing airline may register a new airline until there are at least four airlines registered", async function() {
      for (const airline of accounts.slice(2, 4)) {
        await appContract.addAirline(airline);

        let isRegistered = await dataContract.isRegistered(airline, {
          from: appContract.address
        });

        assert.equal(
          isRegistered,
          true,
          "Airline should be able to add a new airline"
        );

        await appContract.fund({ from: airline, value: fee });

        let isAirline = await dataContract.isAirline(airline, {
          from: appContract.address
        });

        assert.equal(
          isAirline,
          true,
          "Funded airline should have airline role"
        );
      }

      // There are now 4 airlines total so fifthAirline requires 2 (50%) votes to
      // be registered.
      const fifthAirline = accounts[4];

      // 1st vote
      await appContract.addAirline(fifthAirline);
      const isRegistered = await dataContract.isRegistered(fifthAirline, {
        from: appContract.address
      });
      assert.equal(
        isRegistered,
        false,
        "An Airline cannot add a new airline without 50% votes"
      );
    });

    it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async function() {
      // fifthAirline requires 2 votes to be registered
      const fifthAirline = accounts[4];

      // 2nd vote (first vote comes from previous test)
      await appContract.addAirline(fifthAirline, { from: accounts[1] });
      let isRegistered = await dataContract.isRegistered(fifthAirline, {
        from: appContract.address
      });
      assert.equal(
        isRegistered,
        true,
        "New airline is registered when getting 50% votes"
      );

      await appContract.fund({ from: fifthAirline, value: fee });
      let isAirline = await dataContract.isAirline(fifthAirline, {
        from: appContract.address
      });
      assert.equal(isAirline, true, "Funded airline should have airline role");

      // There are now 5 airlines total so sixthAirline requires 3 (50% rounded
      // up) votes to be registered.
      const sixthAirline = accounts[5];

      // 1st vote
      await appContract.addAirline(sixthAirline);
      isRegistered = await dataContract.isRegistered(sixthAirline, {
        from: appContract.address
      });
      assert.equal(
        isRegistered,
        false,
        "An Airline cannot add a new airline without 50% votes"
      );

      // 2nd vote
      await appContract.addAirline(sixthAirline, { from: accounts[1] });
      isRegistered = await dataContract.isRegistered(sixthAirline, {
        from: appContract.address
      });
      assert.equal(
        isRegistered,
        false,
        "An Airline cannot add a new airline without 50% votes"
      );

      // 3rd vote
      await appContract.addAirline(sixthAirline, { from: accounts[2] });
      isRegistered = await dataContract.isRegistered(sixthAirline, {
        from: appContract.address
      });
      assert.equal(
        isRegistered,
        true,
        "New airline is registered when getting 50% votes"
      );
    });

    it("Airline can register flight for insurance", async function() {
      const airline = accounts[2],
        flight = "test",
        timestamp = 12345;

      await appContract.registerFlight(flight, timestamp, { from: airline });

      const key = web3.utils.hexToBytes(
        web3.utils.soliditySha3(airline, flight, timestamp)
      );
      const result = await dataContract.isFlightRegistered(key, {
        from: appContract.address
      });

      assert(result, true, "Airline could not register flight");
    });
  });

  describe("Passengers", function() {
    let passenger, airline, flight, timestamp, key;

    before(function() {
      passenger = accounts[6];
      airline = accounts[2];
      flight = "test";
      timestamp = 12345;
      key = web3.utils.hexToBytes(
        web3.utils.soliditySha3(airline, flight, timestamp)
      );
    });

    it.skip("Passengers can choose from a fixed list of flight numbers and departure that are defined in the Dapp client", async function() {
      // TODO: Move this test to frontend
    });

    it("Passengers may pay up to 1 ether for purchasing flight insurance.", async function() {
      let reason;
      try {
        await appContract.purchaseInsurance(new Uint8Array(32), {
          from: passenger
        });
      } catch (error) {
        reason = error.reason;
      }

      assert.equal(
        reason,
        "Passenger need to send some ether to purchase flight insurance"
      );

      try {
        await appContract.purchaseInsurance(new Uint8Array(32), {
          from: passenger,
          value: web3.utils.toWei("1.1")
        });
      } catch (error) {
        reason = error.reason;
      }

      assert.equal(reason, "Maximum insurance purchase amount is 1 ether");
    });

    it("Passenger cannot purchase insurance if flight is not registered", async function() {
      let reason;
      try {
        await appContract.purchaseInsurance(new Uint8Array(32), {
          from: passenger,
          value: web3.utils.toWei("0.5")
        });
      } catch (error) {
        reason = error.reason;
      }

      assert.equal(reason, "Flight is not registered");
    });

    // TODO: fix test
    it.skip("Passenger can purchase insurance if flight is registered", async function() {
      await appContract.purchaseInsurance(key, {
        from: passenger,
        value: web3.utils.toWei("0.5")
      });

      const result = await dataContract.getInsurance(passenger, key, {
        from: appContract.address
      });

      assert.equal(
        result.deposit,
        web3.utils.toWei("0.5"),
        "Passenger could not purchase insurance"
      );
      assert.equal(
        result.isPaid,
        false,
        "Passenger could not purchase insurance"
      );
      assert.equal(
        result.rate,
        "150",
        "Passenger could not purchase insurance"
      );
    });

    it("If flight is not delayed due to airline fault, passenger cannot claim credit of 1.5X the amount they paid", async function() {
      try {
        await appContract.claim(key, { from: passenger });
      } catch (error) {
        reason = error.reason;
      }
      assert.equal(
        reason,
        "Flight is not delayed due to airline fault",
        "Passenger should not be able to claim insurance if flight is not delayed"
      );
    });
  });
});
