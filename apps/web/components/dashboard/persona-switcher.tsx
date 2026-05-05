import Link from "next/link";

import type { Persona } from "@jaguar/domain";

import { DEFAULT_PERSONA, PERSONA_OPTIONS } from "@/lib/persona";

type Props = {
  activePersona: Persona;
  basePath: string;
  compact?: boolean;
};

export function PersonaSwitcher({ activePersona, basePath, compact = false }: Props) {
  return (
    <div
      className={compact ? "persona-switch compact" : "persona-switch"}
      aria-label="Persona lens"
    >
      <span className="persona-switch-label">Persona</span>
      <div className="persona-switch-options">
        {PERSONA_OPTIONS.map((option) => {
          const href =
            option.value === DEFAULT_PERSONA
              ? basePath
              : `${basePath}?persona=${encodeURIComponent(option.value)}`;
          return (
            <Link
              key={option.value}
              href={href}
              className={
                activePersona === option.value ? "persona-option active" : "persona-option"
              }
              aria-current={activePersona === option.value ? "page" : undefined}
              title={option.description}
            >
              <span>{option.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
