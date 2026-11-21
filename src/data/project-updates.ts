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
      title: "Six-session pilot did not proceed",
      text: "The 2026 health and wellbeing pilot was closed before any sessions took place, because it could not go ahead under the arrangements available. We are using the planning experience to refine the Unity House model. No new delivery programme has been confirmed.",
    },
  ],
  "satul-conectat-romania": [
    {
      date: "November 2026",
      isoDate: "2026-11",
      title: "Exploratory correspondence with ADR Nord-Vest",
      text: "We shared information about Satul Conectat România and Clandestinus Educational Games with ADR Nord-Vest, the North-West Romania regional development agency, as exploratory discussions. This is not a funding application. No partner, pilot or funding is confirmed, and Reci remains a separate pilot idea.",
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
