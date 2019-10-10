import { helper } from "@ember/component/helper";

const STATUS_CODE_ON_TIME = "10";
const STATUS_CODE_LATE_AIRLINE = "20";
const STATUS_CODE_LATE_WEATHER = "30";
const STATUS_CODE_LATE_TECHNICAL = "40";
const STATUS_CODE_LATE_OTHER = "50";

export default helper(function getStatus(params /*, hash*/) {
  switch (params[0]) {
    case STATUS_CODE_ON_TIME:
      return "On Time";
    case STATUS_CODE_LATE_AIRLINE:
      return "Late: Airline";
    case STATUS_CODE_LATE_WEATHER:
      return "Late: Weather";
    case STATUS_CODE_LATE_TECHNICAL:
      return "Late: Technical";
    case STATUS_CODE_LATE_OTHER:
      return "Late: Other";
    default:
      return "Unknown";
  }
});
