/**
 * Small helpers that keep chart labels readable at narrow widths (SHIG 85 / 95)
 * and put values in text rather than colour alone (SHIG 96).
 */

/** Split a label into lines of at most `maxChars`, preferring breaks after "+" or at spaces. */
export function splitLabel(label: string, maxChars: number): string[] {
  const tokens = label.split(/(?<=\+)|\s+/).filter((t) => t.length > 0);
  const lines: string[] = [];
  let current = "";
  for (const token of tokens) {
    if (current && (current + token).length > maxChars) {
      lines.push(current);
      current = "";
    }
    let rest = token;
    while (rest.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    current += rest;
  }
  if (current) lines.push(current);
  return lines;
}

interface WrappedTickProps {
  x?: number;
  y?: number;
  payload?: { value: string | number };
  maxChars?: number;
  anchor?: "start" | "middle" | "end";
  fontSize?: number;
}

/** Recharts axis tick that wraps long category names onto several lines. */
export function WrappedTick({ x = 0, y = 0, payload, maxChars = 7, anchor = "middle", fontSize = 11 }: WrappedTickProps) {
  if (!payload) return null;
  const lines = splitLabel(String(payload.value), maxChars);
  const lineHeight = fontSize + 2;
  // Vertical axis ticks are centred on the category; horizontal ones hang below the axis.
  const dy = anchor === "end" ? -((lines.length - 1) * lineHeight) / 2 + fontSize / 3 : fontSize;
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={fontSize} fill="currentColor" className="text-muted-foreground">
      {lines.map((line, i) => (
        <tspan key={i} x={anchor === "end" ? x - 4 : x} dy={i === 0 ? dy : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** "+12" / "-3" / "0" for bar value labels. */
export function signedManYen(v: number): string {
  return v > 0 ? `+${v}` : String(v);
}
