import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";

export default class DashboardComponent extends Component {
  @tracked selectedAirline = null;
  @tracked selectedFlightNumber = null;
  @tracked selectedPassenger = null;
  @tracked flightStatuses = [];
  @tracked isFetching = false;
  @tracked statusFetchFailed = false;
  @tracked amount = 0.1;
  @tracked balance = null;

  @service contract;
  @service notify;

  get isFetchBtnDisabled() {
    const { selectedFlight, isFetching, statusFetchFailed } = this;
    if (isFetching) {
      return !statusFetchFailed;
    }
    return selectedFlight ? false : true;
  }

  get isBuyBtnDisabled() {
    const { selectedFlight, isFetching, selectedPassenger, amount } = this;

    if (!selectedPassenger) {
      return true;
    }

    if (!amount || amount < 0.1) {
      return true;
    }

    if (isFetching) {
      return true;
    }

    return selectedFlight ? false : true;
  }

  get isWithdrawBtnDisabled() {
    const { selectedPassenger } = this;
    return selectedPassenger ? false : true;
  }

  get filteredFlights() {
    const {
      selectedAirline,
      args: { flights }
    } = this;
    if (!selectedAirline) {
      return flights;
    }
    return flights.filter(
      flight => flight.airline.designator === selectedAirline
    );
  }

  get selectedFlight() {
    const {
      selectedFlightNumber,
      args: { flights }
    } = this;

    return flights.find(flight => flight.number === selectedFlightNumber);
  }

  updateFlightStatus(error, event) {
    if (error) {
      console.log(error);
      this.notify.error(error.message);
      return;
    }

    const { airline, flight, timestamp, status } = event.returnValues;

    clearTimeout(this.timeout);
    this.statusFetchFailed = false;
    this.isFetching = false;
    const index = this.flightStatuses.findIndex(
      ({ flight: savedFlight }) => savedFlight === flight
    );
    if (index > -1) {
      this.flightStatuses[index] = {
        airline,
        flight,
        timestamp: Date(timestamp),
        status,
        isClaimable: status === "20"
      };
      this.flightStatuses = [...this.flightStatuses];
    } else {
      this.flightStatuses = [
        {
          airline,
          flight,
          timestamp: Date(timestamp),
          status,
          isClaimable: status === "20"
        },
        ...this.flightStatuses
      ];
    }

    this.notify.success("Flight status updated!");
  }

  @action
  selectAirline(designator) {
    this.selectedFlightNumber = null;
    this.selectedAirline = designator;
  }

  @action
  async fetchFlightStatus() {
    const { contract, selectedFlight } = this;
    this.isFetching = true;

    this.notify.info(
      "Waiting for flight status update from oracles... Please wait."
    );

    const status = await contract.getStatus(selectedFlight);
    if (parseInt(status, 10) > 0) {
      const {
        airline: { address },
        number,
        timestamp
      } = selectedFlight;

      this.updateFlightStatus(null, {
        returnValues: { airline: address, flight: number, timestamp, status }
      });

      return;
    }

    if (!this.statusFetchFailed) {
      contract.appContract.once(
        "FlightStatusInfo",
        {
          filter: {
            flightKey: [contract.getFlightKey(selectedFlight)]
          }
        },
        this.updateFlightStatus.bind(this)
      );
    }

    this.statusFetchFailed = false;

    try {
      await contract.fetchFlightStatus(selectedFlight);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }

    // Start a timeout in case oracles do not reach consensus
    this.timeout = setTimeout(() => {
      this.statusFetchFailed = true;
      this.notify.info(
        "Could not get a flight status update from oracles. Please try again."
      );
    }, 5000);
  }

  @action
  async purchaseInsurance() {
    const { contract, selectedFlight, amount, selectedPassenger } = this;

    this.notify.info("Purchasing insurance... Please wait.");

    const key = contract.getFlightKey(selectedFlight);

    contract.dataContract.once(
      "InsurancePurchased",
      { filter: { key: [key], passenger: selectedPassenger } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Flight has been insured");
      }
    );

    try {
      await contract.purchaseInsurance(
        selectedFlight,
        selectedPassenger,
        amount
      );
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async claim(flightInfo) {
    if (!flightInfo) {
      return;
    }

    const { contract, selectedPassenger } = this;
    const flight = this.args.flights.find(
      el => el.number === flightInfo.flight
    );

    this.notify.info("Claiming insurance... Please wait.");

    const key = contract.getFlightKey(flight);

    contract.dataContract.once(
      "InsuranceClaimed",
      { filter: { key: [key], passenger: selectedPassenger } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Insurance has been claimed.");
      }
    );

    try {
      await contract.claim(flight, selectedPassenger);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async withdraw() {
    const { contract, selectedPassenger } = this;

    this.notify.info("Withdrawing balance... Please wait.");

    contract.dataContract.once(
      "BalanceWithdrawn",
      { filter: { passenger: selectedPassenger } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Balance has been withdrawn.");
      }
    );

    try {
      await contract.withdraw(selectedPassenger);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async checkBalance() {
    const { contract, selectedPassenger } = this;

    this.notify.info("Checking balance... Please wait.");

    try {
      const balance = await contract.checkBalance(selectedPassenger);
      this.balance = contract.web3.utils.fromWei(balance);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }
}
