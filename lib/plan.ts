export const FREE_PLAN = {
  name: "Free",
  priceLabel: "$0",
  intervalLabel: "",
  features: [
    "5 generations per day",
    "User flow to Playwright draft",
    "HTML or JSX evidence input",
    "API contract test generation",
    "Component behavior test generation",
    "Copy and download output",
    "Continue as a reviewed Workspace draft",
  ],
};

export const PRO_PLAN = {
  name: "Team + CI",
  priceLabel: "Waitlist",
  intervalLabel: "",
  features: [
    "GitHub and CI integration",
    "Isolated Playwright execution",
    "Pull-request quality reporting",
    "Organization usage controls",
    "Production support terms",
  ],
};

export const APP_LIMITS = {
  freeDailyGenerations: 5,
};

export const PRO_WAITLIST_COPY = {
  title: "Join the Team + CI waitlist",
  description:
    "Get launch updates when GitHub, isolated execution, entitlements, and team support are ready.",
  buttonText: "Join waitlist",
};
