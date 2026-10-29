export const INCIDENT_CATEGORIES = [
  { id: "road", title: "Road & transport", examples: "Vehicle collisions, cycle crashes, damaged road surfaces.", capture: "Visible damage, road conditions, nearby landmarks, and blocked lanes.", column: 0, row: 0 },
  { id: "workplace", title: "Workplace", examples: "Slips, falling objects, or damaged equipment.", capture: "The hazard and where it happened. Keep a safe distance.", column: 1, row: 0 },
  { id: "home", title: "Home & property", examples: "Damaged fixtures, broken stairs, burns, and household hazards.", capture: "The affected fixture or surface and its location within the property.", column: 2, row: 0 },
  { id: "recreation", title: "Sports & recreation", examples: "Damaged sports equipment, unsafe play areas, and leisure incidents.", capture: "Equipment condition, surface hazards, and the activity area.", column: 3, row: 0 },
  { id: "industrial", title: "Industrial", examples: "Equipment failures, damaged machinery, and pipe ruptures.", capture: "Visible equipment damage and identifying details from a safe distance.", column: 0, row: 1 },
  { id: "fire", title: "Fire & smoke", examples: "Visible smoke, fire damage, and scorched equipment.", capture: "Only what is visible from a safe location. Never approach a fire for a photo.", column: 1, row: 1 },
  { id: "flood", title: "Flooding & leaks", examples: "Water intrusion, burst pipes, overflowing drains, and flooded paths.", capture: "The affected area and visible water extent without entering floodwater.", column: 2, row: 1 },
  { id: "electrical", title: "Electrical", examples: "Exposed wiring, damaged sockets, downed cables, and outage damage.", capture: "Visible damage from a safe distance. Do not touch equipment or cables.", column: 3, row: 1 },
  { id: "structural", title: "Structural damage", examples: "Cracked walls, collapsed fences, broken stairs, and falling debris.", capture: "The damaged structure and surrounding area without entering unstable spaces.", column: 0, row: 2 },
  { id: "weather", title: "Storm & tree damage", examples: "Fallen trees, wind damage, hail damage, and storm debris.", capture: "Affected structures, fallen branches, and any access obstruction.", column: 1, row: 2 },
  { id: "chemical", title: "Chemical & pollution", examples: "Spills, leaking containers, dumped waste, and visible contamination.", capture: "Visible container labels and spill extent only if safely observable. Do not approach unknown substances.", column: 2, row: 2 },
  { id: "access", title: "Blocked access", examples: "Obstructed walkways, fallen barriers, debris, and damaged access routes.", capture: "The obstruction, the route it affects, and nearby landmarks.", column: 3, row: 2 },
] as const;

export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];
