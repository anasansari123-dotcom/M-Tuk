export const brand = {
  name: "MTUK Nagar Ride",
  short: "MTUK",
  tagline: "Apna Nagar. Apni Ride.",
  description:
    "Live e-rickshaw booking for passengers and verified local service providers. Same app, same network, same fare you see before you ride.",
  email: "hello@mtuknagarride.com",
  phone: "",
  hours: "6:00 AM – 11:00 PM · All days",
  city: "Your nagar, on demand",
  logo: "/mtuk-logo.png",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/partner", label: "Become a partner" },
  { href: "/contact", label: "Contact" },
];

export const company = "M-TUK Innovations";

export type Leader = {
  slug: string;
  name: string;
  initials: string;
  title: string;
  photo: string;
  highlights: string[];
  bio: string[];
  roles: { title: string; org: string[] }[];
  focus: string[];
};

export const team: Leader[] = [
  {
    slug: "mukul-jain",
    name: "Mukul Jain",
    initials: "MJ",
    title: "Founder & Director",
    photo: "/team/mukul-jain.jpg",
    highlights: ["Academician", "Researcher", "Entrepreneur", "Startup & Innovation Professional"],
    bio: [
      "Mr. Mukul Jain is the Founder & Director of M-TUK Innovations, bringing together an interest in innovation, strategic business development, and technology-enabled ventures.",
      "He also serves as the Incubation Manager at SDCMS Incubation Foundation, S.D. College of Management Studies, Muzaffarnagar, where he contributes to startup development, incubation initiatives, entrepreneurial mentoring, and strengthening the institutional startup ecosystem.",
      "With experience spanning management education, academic research, and institutional incubation, he brings an integrated perspective to venture development and innovation management. Through M-TUK Innovations, he aims to advance practical, scalable solutions in local mobility, transportation, logistics, and digital services, with an emphasis on customer convenience, local business enablement, and opportunities in emerging markets.",
    ],
    roles: [
      { title: "Founder & Director", org: ["M-TUK Innovations"] },
      {
        title: "Incubation Manager",
        org: ["SDCMS Incubation Foundation", "S.D. College of Management Studies, Muzaffarnagar"],
      },
    ],
    focus: [
      "Startup incubation & entrepreneurship",
      "Innovation & business development",
      "Technology-enabled business models",
      "Strategic partnerships",
      "Management research & education",
      "Mobility, logistics & digital services",
    ],
  },
  {
    slug: "prashant-tomar",
    name: "Prashant Tomar",
    initials: "PT",
    title: "Director & Co-Founder",
    photo: "/team/prashant-tomar.jpg",
    highlights: ["Technocrat", "Senior Faculty, MCA", "Innovation Activity Coordinator"],
    bio: [
      "Mr. Prashant Tomar is a Technocrat and Senior Faculty Member in the MCA Department at S.D. College of Management Studies, Muzaffarnagar. Combining technical knowledge with an academic perspective, he is actively engaged in technology-oriented initiatives and the development of practical software solutions.",
      "His innovation work includes Stock Management Software and Library Management Software with Barcode. He also serves as the Innovation Activity Coordinator of the SDCMS Institute Innovation Council.",
      "As Director & Co-Founder of M-TUK Innovations, he contributes to the organisation's technology direction and its efforts to build practical digital solutions across local mobility, transportation, logistics, and emerging service sectors.",
    ],
    roles: [
      { title: "Director & Co-Founder", org: ["M-TUK Innovations"] },
      {
        title: "Senior Faculty Member, MCA Department",
        org: ["S.D. College of Management Studies, Muzaffarnagar"],
      },
      { title: "Innovation Activity Coordinator", org: ["SDCMS Institute Innovation Council"] },
    ],
    focus: [
      "Technology direction",
      "Practical software solutions",
      "Stock & library management systems",
      "Institutional innovation",
      "Mobility, logistics & service sectors",
    ],
  },
  {
    slug: "mohd-anas",
    name: "Mohd Anas",
    initials: "MA",
    title: "Chief Technology Officer (CTO)",
    photo: "/team/mohd-anas.jpg",
    highlights: ["Technologist", "Product Builder", "Systems Architect", "Digital Innovation Professional"],
    bio: [
      "Mr. Mohd Anas is the Chief Technology Officer (CTO) of M-TUK Innovations, where he leads the company's technology vision, product engineering, and digital infrastructure.",
      "He is responsible for translating business goals into reliable, scalable technology solutions, overseeing the design and development of the company's web and mobile platforms, backend systems, and operational tools. His work spans software architecture, cloud deployment, data management, and system security, with a strong focus on performance, usability, and long-term scalability.",
      "Working closely with the founding team, he drives the technical execution of M-TUK Innovations' initiatives in local mobility, transportation, logistics, and digital services, building technology that improves customer convenience, enables local businesses, and supports growth in emerging markets.",
    ],
    roles: [
      {
        title: "Chief Technology Officer (CTO)",
        org: ["M-TUK Innovations", "Engineering, Platform & Product Development"],
      },
    ],
    focus: [
      "Technology strategy & product roadmap",
      "Software architecture & system design",
      "Web & mobile application development",
      "Cloud infrastructure, security & scalability",
      "Data, automation & AI-enabled solutions",
      "Mobility, logistics & digital platforms",
    ],
  },
];

export const story = {
  intro:
    "MTUK Nagar Ride started from a simple gap: passengers waiting on the roadside, and e-rickshaw drivers circling without a clear next trip.",
  paragraphs: [
    "Nagar travel is short, frequent, and local. It should not feel like a black-box taxi app built for another city. Fares should be visible. Drivers should be known. The ride should stay in the neighbourhood it belongs to.",
    "We built one network for both sides. Passengers book in the MTUK Nagar Ride app and watch the trip live. Service providers apply here, submit documents, and go online only after the operations team verifies them. The website and the app share the same accounts, the same vehicles, and the same ride ledger.",
    "The aim is not a marketplace of strangers. It is a trusted nagar fleet — drivers who can earn on every verified trip, and families who can send someone to the market without guessing the fare.",
  ],
  beliefs: [
    { title: "Local first", body: "Routes, pricing and partners are built for nagar trips, not airport runs." },
    { title: "Verify before pickup", body: "A driver goes online only after documents are checked by the admin team." },
    { title: "One platform", body: "The website, the admin desk and the mobile app are the same system." },
  ],
};

export const partnerSteps = [
  {
    step: "01",
    title: "Apply on this website",
    body: "Share your details, vehicle number and documents. This is the only place we collect partner KYC.",
  },
  {
    step: "02",
    title: "Admin verifies you",
    body: "The operations team reviews your licence, RC and ID on the same dashboard that runs live rides.",
  },
  {
    step: "03",
    title: "Sign in to the app",
    body: "Use the email and password from your application. Your service-provider profile is already waiting.",
  },
  {
    step: "04",
    title: "Go online and pick up",
    body: "Approved partners receive nearby requests, start with the passenger OTP, and complete the trip.",
  },
];
