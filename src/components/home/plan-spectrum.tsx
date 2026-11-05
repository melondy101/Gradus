import { PLAN_CHROMATIC_COLORS } from "@/lib/design-tokens";

export function PlanSpectrum({ levels }: { levels?: number[] }) {
  return (
    <div className="grid h-2.5 grid-cols-6" aria-hidden="true">
      {PLAN_CHROMATIC_COLORS.map((color, index) => {
        const level = index + 1;
        return (
          <span
            key={level}
            className="transition-opacity"
            style={{
              background: color,
              opacity: !levels || levels.includes(level) ? 1 : 0.18,
            }}
          />
        );
      })}
    </div>
  );
}
