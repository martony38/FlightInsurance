import Route from "@ember/routing/route";

export default class AirlineRoute extends Route {
  async model() {
    let response = await fetch("http://localhost:3000/api/flights");
    const { flights, airlines } = await response.json();

    return { flights, airlines };
  }
}
