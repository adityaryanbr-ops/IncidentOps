import type { SampleIncident } from "./types";

export const SAMPLE_INCIDENTS: SampleIncident[] = [
  {
    id: "north-walkway",
    title: "Fallen fence on a walkway",
    location: "30.286100, -97.739400",
    reportText:
      "A fallen fence is blocking the walkway. People are still walking through.",
    imagePath: "/samples/walkway-debris.png",
    latitude: 30.2861,
    longitude: -97.7394,
  },
  {
    id: "utility-flood",
    title: "Water outside a utility room",
    location: "30.284900, -97.736500",
    reportText:
      "Water is collecting outside the utility room, beside an electrical closet.",
    imagePath: "/samples/utility-flood.png",
    latitude: 30.2849,
    longitude: -97.7365,
  },
  {
    id: "road-sink",
    title: "A sinking patch of road",
    location: "30.282200, -97.732800",
    reportText:
      "The road is sinking near Lot C. Delivery vans are still using it.",
    imagePath: "/samples/road-sink.png",
    latitude: 30.2822,
    longitude: -97.7328,
  },
];
