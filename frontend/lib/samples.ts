import type { SampleIncident } from "./types";

export const SAMPLE_INCIDENTS: SampleIncident[] = [
  {
    id: "north-walkway",
    title: "Blocked north walkway",
    location: "Campus North Gate, Austin, TX",
    reportText:
      "Fence panel collapsed across the pedestrian walkway near the stadium entrance. Debris spreading onto the path; students still trying to cut through.",
    imagePath: "/samples/walkway-debris.png",
    latitude: 30.2861,
    longitude: -97.7394,
  },
  {
    id: "utility-flood",
    title: "Utility room water intrusion",
    location: "Facilities Building B, Loading Dock",
    reportText:
      "Standing water observed outside the utility access door after overnight rain. Possible drainage backup; electrical closet is adjacent.",
    imagePath: "/samples/utility-flood.png",
    latitude: 30.2849,
    longitude: -97.7365,
  },
  {
    id: "road-sink",
    title: "Service road surface failure",
    location: "East Service Road near Lot C",
    reportText:
      "Asphalt depression widening near the service lane. Delivery vans still using the route. Request advisory severity and temporary traffic plan.",
    imagePath: "/samples/road-sink.png",
    latitude: 30.2822,
    longitude: -97.7328,
  },
];
