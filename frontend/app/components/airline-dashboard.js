import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class AirlineDashboardComponent extends Component {
  @tracked selectedAirline = null;
  @tracked selectedFlightNumber = null;
  @tracked amount = null;

  @service contract;
  @service notify;

  get filteredFlights() {
    const {
      selectedAirline,
      args: { flights }
    } = this;
    if (!selectedAirline) {
      return null;
    }
    return flights.filter(
      flight => flight.airline.designator === selectedAirline
    );
  }

  get isRegisterBtnDisabled() {
    const { selectedFlightNumber } = this;
    return selectedFlightNumber ? false : true;
  }

  get isFundBtnDisabled() {
    const { amount } = this;
    return amount >= 10 ? false : true;
  }

  @action
  selectAirline(designator) {
    this.selectedFlightNumber = null;
    this.selectedAirline = designator;
  }

  @action
  async registerFlight() {
    const {
      selectedFlightNumber,
      contract,
      args: { flights }
    } = this;
    const flight = flights.find(el => el.number === selectedFlightNumber);

    this.notify.info("Registering flight... Please wait.");

    const key = contract.getFlightKey(flight);

    contract.dataContract.once(
      "FlightRegistered",
      { filter: { key: [key] } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Flight has been registered");
      }
    );

    try {
      await contract.registerFlight(flight);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async fundRegistration() {
    const {
      selectedAirline,
      amount,
      contract,
      args: { airlines }
    } = this;

    const airline = airlines.find(el => el.designator === selectedAirline);

    this.notify.info("Sending registration fee... Please wait.");

    contract.dataContract.once(
      "AirlineAdded",
      { filter: { account: airline.address } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Airline has been activated");
      }
    );

    try {
      await contract.fund(airline.address, amount);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }
}
