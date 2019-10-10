import { helper } from "@ember/component/helper";

// Taken from https://stackoverflow.com/questions/34189233/ember-2-truncate-text-and-add-ellipses#34190262
export default helper(function truncateText(params, hash) {
  const [value] = params;
  const { limit } = hash;
  let text = "";

  if (value != null && value.length > 0) {
    text = value.substr(0, limit);

    if (value.length > limit) {
      text += "...";
    }
  }

  return text;
});
