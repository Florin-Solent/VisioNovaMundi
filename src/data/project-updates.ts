export interface ProjectUpdate {
  date: string;
  isoDate: string;
  title: string;
  text: string;
}

// Add only dated updates already supported by project records or published evidence.
export const projectUpdates: Record<string, ProjectUpdate[]> = {
  "guardian-glide": [],
  "unity-house": [
    {
      date: "28 August 2026",
      isoDate: "2026-08-28",
      title: "Council award recorded",
      text: "The grant agreement records a £2,000 award for the Romanian Healthy Living and Community Kitchen Pilot.",
    },
  ],
  vialora: [
    {
      date: "16 July 2026",
      isoDate: "2026-07-16",
      title: "Early investigation documented",
      text: "The refill-oriented fragrance concept entered early investigation; its product format and public naming remained under evaluation.",
    },
  ],
  "vialora-voyage": [
    {
      date: "22 July 2026",
      isoDate: "2026-07-22",
      title: "Concept direction documented",
      text: "A travel-grooming concept and a reduced direction for future practical validation were recorded.",
    },
  ],
};
