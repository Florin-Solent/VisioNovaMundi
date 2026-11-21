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
      date: "November 2026",
      isoDate: "2026-11",
      title: "Pre-delivery evidence requested",
      text: "The Council confirmed that the pilot's healthy-eating and social-wellbeing focus fits the fund, and asked for facilitation and safeguarding evidence before funding is released. Sessions will be scheduled once that review is complete.",
    },
    {
      date: "28 August 2026",
      isoDate: "2026-08-28",
      title: "Council award recorded",
      text: "The grant agreement records a £2,000 award for the Romanian Healthy Living and Community Kitchen Pilot.",
    },
  ],
  "satul-conectat-romania": [
    {
      date: "9 November 2026",
      isoDate: "2026-11-09",
      title: "Exploratory education proposal prepared for North-West Romania",
      text: "A proposal for ADR Nord-Vest's INNO platform sets out staged next steps for the education strand: technically verify a browser lesson first, then a teacher-only evaluation with no pupils involved. It asks for an academic contact and two or three libraries, schools or communes to talk to. No partner, pilot or funding is confirmed, and Reci remains a separate pilot idea.",
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
