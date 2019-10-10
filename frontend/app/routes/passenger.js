import Route from "@ember/routing/route";

export default class PassengerRoute extends Route {
  async model() {
    let response = await fetch("http://localhost:3000/api/flights");
    const { flights, airlines } = await response.json();

    response = await fetch("http://localhost:3000/api/passengers");
    const passengers = await response.json();

    return { flights, airlines, passengers };
  }
}
