import type { Persona, ScoredLaunch, Verdict } from "@jaguar/domain";
import { personaScore } from "@jaguar/scoring";

export const PERSONA_OPTIONS = [
  {
    value: "momentum",
    label: "Momentum",
    shortLabel: "Momentum",
    description: "Balanced thresholding for sustained flow.",
  },
  {
    value: "degen",
    label: "Degen",
    shortLabel: "Degen",
    description: "Earlier watch/enter bias for fast tape.",
  },
  {
    value: "risk-first",
    label: "Risk-first",
    shortLabel: "Risk",
    description: "Requires more confirmation before action.",
  },
] as const satisfies readonly {
  value: Persona;
  label: string;
  shortLabel: string;
  description: string;
}[];

export const DEFAULT_PERSONA: Persona = "momentum";

export const normalizePersona = (value: string | undefined): Persona =>
  PERSONA_OPTIONS.some((option) => option.value === value) ? (value as Persona) : DEFAULT_PERSONA;

export const personaLabel = (persona: Persona) =>
  PERSONA_OPTIONS.find((option) => option.value === persona)?.label ?? "Momentum";

export const personaDescription = (persona: Persona) =>
  PERSONA_OPTIONS.find((option) => option.value === persona)?.description ??
  PERSONA_OPTIONS[0].description;

export const launchPersonaScore = (launch: ScoredLaunch, persona: Persona) =>
  personaScore(launch.score, persona);

export const launchPersonaVerdict = (launch: ScoredLaunch, persona: Persona): Verdict =>
  launch.personaVerdicts[persona];

export const withPersonaParam = (href: string, persona: Persona) => {
  if (persona === DEFAULT_PERSONA) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}persona=${persona}`;
};

export const personaThresholdLine = (persona: Persona) => {
  if (persona === "degen") return "Degen reads scores 5 points earlier than global momentum.";
  if (persona === "risk-first") return "Risk-first requires 8 extra points of confirmation.";
  return "Momentum uses Jaguar's base thresholds: watch at 30, enter at 60.";
};
