const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelativeDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return relativeTimeFormatter.format(diffDays, "day");
}

export function normalize(value) {
  return value.trim().toLowerCase();
}

export function setVisibility(element, visible) {
  if (visible) {
    element.removeAttribute("hidden");
  } else {
    element.setAttribute("hidden", "");
  }
}
