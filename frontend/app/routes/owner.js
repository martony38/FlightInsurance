import Route from "@ember/routing/route";

export default class OwnerRoute extends Route {
  async model() {
    let response = await fetch("http://localhost:3000/api/flights");
    const { airlines } = await response.json();

    response = await fetch("http://localhost:3000/api/admins");
    const admins = await response.json();

    return { airlines, admins };
  }
}
