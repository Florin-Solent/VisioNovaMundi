export interface PortfolioProject {
  title: string;
  href: string;
  relationship: string;
  status: string;
  summary: string;
  relevance: string;
  image?: string;
  imageAlt?: string;
  imageFit?: "cover" | "contain";
  imageLabel?: string;
  visualLabel: string;
  visualMark: string;
  /** Position on the homepage evidence ladder; must match a stage in evidenceLadders. */
  ladder: string;
}

export interface PortfolioGroup {
  id: string;
  title: string;
  intro: string;
  projects: PortfolioProject[];
}

export const projectGroups: PortfolioGroup[] = [
  {
    id: "public-benefit",
    title: "Public-benefit work and research",
    intro: "CIC-led delivery and research, with proposals clearly labelled by stage.",
    projects: [
      {
        title: "Unity House",
        href: "/unity-house/",
        relationship: "Visio Nova Mundi CIC",
        status: "Research and development",
        summary: "A proposed community-centre model focused on reducing waste, supporting affordable food access, encouraging reuse and strengthening connections between neighbours.",
        relevance: "A six-session health-and-wellbeing pilot was developed in 2026 but did not proceed; the planning experience is being used to refine the model. No permanent centre or new delivery programme is confirmed.",
        image: "/images/unity-house-concept.webp",
        imageAlt: "Concept visual of a proposed future Unity House community hub, with neighbours cooking and learning together; it does not depict an operating centre.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Community · wellbeing",
        visualMark: "UH",
        ladder: "Discovery",
      },
      {
        title: "Circular Justice",
        href: "/circular-justice/",
        relationship: "CIC research concept",
        status: "Discovery stage",
        summary: "Research into institutional material flows and responsible opportunities for reuse, learning and rehabilitation.",
        relevance: "Could inform more circular approaches, subject to research, partners and feasibility; no funded pilot or live platform is documented.",
        image: "/images/circular-justice-concept.webp",
        imageAlt: "Concept visual of a community repair workshop and open garden path, symbolising circular reuse and pathways to reintegration.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Reuse · research",
        visualMark: "CJ",
        ladder: "Discovery",
      },
      {
        title: "Satul Conectat România",
        href: "/satul-conectat-romania/",
        relationship: "VNM-developed proposal",
        status: "Proposed; delivery unconfirmed",
        summary: "A proposed rural community model combining digital inclusion, local information, learning and connections between villages.",
        relevance: "Explores ways to improve access to information and community opportunities; no pilot or funding is confirmed.",
        image: "/images/satul-conectat-romania-concept.webp",
        imageAlt: "Concept visual of people of different generations learning together in a Romanian village community hub, with surrounding rural homes and hills.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Digital · village",
        visualMark: "SC",
        ladder: "Proposal",
      },
    ],
  },
  {
    id: "independent-ventures",
    title: "Independent and founder-led ventures",
    intro: "Independent ventures and concepts, each with its own development path.",
    projects: [
      {
        title: "Project Clandestinus",
        href: "/project-clandestinus/",
        relationship: "Independent creative and publishing venture",
        status: "Books published; wider concepts developing",
        summary: "A reader-led creative world built around books, symbols, coded messages and discovery.",
        relevance: "Its creative and educational ideas may invite curiosity, close reading and collaborative interpretation; outcomes are not presented as proven.",
        image: "/images/clandestinus-book-i-cover.webp",
        imageAlt: "Cover of Clandestinus Book I, The First Gate",
        visualLabel: "Creative · publishing",
        visualMark: "PC",
        ladder: "Released",
      },
      {
        title: "Clandestinus Secret App",
        href: "/clandestinus-secret-app/",
        relationship: "Project Clandestinus development",
        status: "Active private development",
        summary: "A private communication experience inspired by the Clandestinus language and world; it has not been publicly released.",
        relevance: "Its purpose and wider relevance remain exploratory; no public validation or security review is documented.",
        image: "/images/clandestinus-secret-app-concept.webp",
        imageAlt: "Concept visual of a coded message being shared in an archive, representing the private communication idea without showing security technology.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Private · in development",
        visualMark: "CS",
        ladder: "Prototype",
      },
      {
        title: "TradeVault",
        href: "/tradevault/",
        relationship: "Founder-led product venture",
        status: "Pre-prototype development",
        summary: "TradeVault Painter Pro explores mobile storage and workflow around the everyday equipment needs of painters and decorators.",
        relevance: "Could inform practical tools for skilled trades; there is no product for sale or validated outcome claim.",
        image: "/images/tradevault-concept.webp",
        imageAlt: "Concept visual of two people checking a protected artisan object during a handover, suggesting trusted custody and verification.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Tools · workflow",
        visualMark: "TV",
        ladder: "Concept",
      },
      {
        title: "OneLoo",
        href: "/oneloo-total/",
        relationship: "Founder-led concept",
        status: "Early concept and feasibility",
        summary: "A household-care concept exploring whether selected toilet-care tasks could fit into a simpler routine.",
        relevance: "The opportunity is everyday convenience; formulation, safety and product performance remain unvalidated.",
        image: "/images/oneloo-concept.webp",
        imageAlt: "Concept visual of a bright, accessible public washroom with clean modern fixtures, representing dignity and hygiene.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Household · care",
        visualMark: "OL",
        ladder: "Feasibility",
      },
      {
        title: "Guardian One",
        href: "/guardian-one/",
        relationship: "Founder-led concept",
        status: "Concept validation",
        summary: "A compact personal-shelter concept being explored for solo travellers and campers, with physical validation before advanced features.",
        relevance: "Could explore portability and practical personal space; no safety or performance claims are made.",
        image: "/images/guardian-one-concept.webp",
        imageAlt: "Concept visual of a solo traveller beside a compact shelter at dawn, representing a personal-shelter idea.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Personal · shelter",
        visualMark: "G1",
        ladder: "Feasibility",
      },
      {
        title: "Guardian Glide — Accessible Shopping Mobility System",
        href: "/guardian-glide/",
        relationship: "Independent/private founder venture",
        status: "Active development / mechanical validation",
        summary: "An accessible shopping-mobility concept exploring a more stable, adaptable way to carry groceries while travelling without a car.",
        relevance: "Could support independent shopping for people with mobility or strength constraints; user and performance outcomes are not yet validated.",
        image: "/images/guardian-glide-concept.webp",
        imageAlt: "Concept visual of an older adult with a grocery carrier on an accessible urban path, representing independent shopping mobility.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Shopping · mobility",
        visualMark: "GG",
        ladder: "Feasibility",
      },
      {
        title: "RoamWing",
        href: "/roamwing/",
        relationship: "Founder-led concept",
        status: "Mechanical feasibility",
        summary: "A creator-travel concept exploring wearable, hands-free filming.",
        relevance: "Could address how travelling creators capture footage while moving; mechanical feasibility remains under exploration.",
        image: "/images/roamwing-concept.webp",
        imageAlt: "Concept visual of a traveller walking outdoors with a wearable camera setup, representing hands-free filming while moving.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Create · in motion",
        visualMark: "RW",
        ladder: "Feasibility",
      },
      {
        title: "Vialora",
        href: "/vialora/",
        relationship: "Founder-led concept",
        status: "Early concept development",
        summary: "A compact, refill-oriented fragrance concept; the product format and public naming remain under evaluation.",
        relevance: "Explores portability and refill formats; no product or environmental benefit has been validated.",
        image: "/images/vialora-concept.webp",
        imageAlt: "Concept visual of luminous glass, citrus and botanicals evoking a refined fragrance atmosphere without depicting a final product.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Fragrance · refill",
        visualMark: "VL",
        ladder: "Concept",
      },
      {
        title: "Vialora Voyage",
        href: "/vialora-voyage/",
        relationship: "Founder-led concept",
        status: "Early concept development",
        summary: "A travel-grooming concept exploring a pack-ready way to organise personal-care essentials between journeys.",
        relevance: "Could support simpler travel organisation; practical validation remains a future step.",
        image: "/images/vialora-voyage-concept.webp",
        imageAlt: "Concept visual of an unbranded compact travel-grooming kit arranged beside an open carry-on in a sunlit room.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Travel · organisation",
        visualMark: "VV",
        ladder: "Concept",
      },
    ],
  },
  {
    id: "future-concepts",
    title: "Future concepts and internal prototypes",
    intro: "Exploratory projects and internal prototypes that are not part of current operating delivery.",
    projects: [
      {
        title: "AdminTrace",
        href: "/admintrace/",
        relationship: "Internal prototype · potential future ecosystem candidate",
        status: "Controlled synthetic-only evaluation · not an operating service",
        summary: "An early-stage Windows desktop prototype for human review of fictional administrative cases.",
        relevance: "The current prototype is authorised only for controlled, local, synthetic-only internal evaluation. It is not approved for operational casework, external demonstrations or distribution. Independent professional security and accessibility assessments remain outstanding; operator, legal vehicle and data responsibilities remain unconfirmed.",
        image: "/images/admintrace-concept.webp",
        imageAlt: "Concept visual of blank records moving through a sequence of translucent document layers, representing an organised administrative process.",
        imageFit: "cover",
        imageLabel: "Concept visual",
        visualLabel: "Process · clarity",
        visualMark: "AT",
        ladder: "Prototype",
      },
    ],
  },
];

export interface EvidenceLadder {
  id: string;
  title: string;
  note: string;
  groups: string[];
  stages: { name: string; meaning: string }[];
}

// Stages are deliberately conservative: a project moves up only when documented evidence supports it.
export const evidenceLadders: EvidenceLadder[] = [
  {
    id: "programmes",
    title: "Public-benefit programmes",
    note: "Led by Visio Nova Mundi CIC.",
    groups: ["public-benefit"],
    stages: [
      { name: "Concept", meaning: "An idea being shaped" },
      { name: "Discovery", meaning: "Researching the problem" },
      { name: "Proposal", meaning: "A plan seeking partners" },
      { name: "Award agreed", meaning: "Funding agreed, not yet delivering" },
      { name: "Delivering", meaning: "Activity under way" },
      { name: "Evaluated", meaning: "Results reported" },
    ],
  },
  {
    id: "ventures",
    title: "Founder ventures and internal prototypes",
    note: "Separate from the CIC, with their own finances and IP.",
    groups: ["independent-ventures", "future-concepts"],
    stages: [
      { name: "Concept", meaning: "An idea being shaped" },
      { name: "Feasibility", meaning: "Testing whether it can work" },
      { name: "Prototype", meaning: "A working version in private testing" },
      { name: "Released", meaning: "Available to the public" },
    ],
  },
];
