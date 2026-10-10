import { z } from "zod";

export const FONT_LABELS: Record<string, string> = { block: "Block", classic: "Classic", modern: "Modern" };

// Latin letters, Bengali script, spaces, apostrophes, dots and hyphens.
const NAME_RE = /^[A-Za-zঀ-৿ .'-]*$/;
const BLOCKED = ["fuck", "shit", "bitch", "cunt", "nazi", "rape"];

export function validatePersonalisation(
  input: { playerName: string; playerNumber: string; font: string; textColor: string; baseColor?: string | null },
  t: { maxNameLength: number; maxNumberDigits: number; allowedFonts: string[]; allowedColors: string[] },
  allowBaseColor: boolean,
): string | null {
  const name = input.playerName.trim();
  if (name.length > t.maxNameLength) return `Name can be at most ${t.maxNameLength} characters.`;
  if (!NAME_RE.test(name)) return "Name can only contain letters, spaces, apostrophes, dots and hyphens.";
  if (BLOCKED.some((w) => name.toLowerCase().includes(w))) return "Please choose a different name.";
  if (!new RegExp(`^\\d{0,${t.maxNumberDigits}}$`).test(input.playerNumber)) return `Number must be up to ${t.maxNumberDigits} digits.`;
  if (!name && !input.playerNumber) return "Add a name or a number.";
  if (!t.allowedFonts.includes(input.font)) return "That font isn't available for this jersey.";
  if (!t.allowedColors.map((c) => c.toLowerCase()).includes(input.textColor.toLowerCase())) return "That print colour isn't available.";
  if (input.baseColor && !allowBaseColor) return "This jersey's base colour can't be changed.";
  return null;
}

export const designInputSchema = z.object({
  productId: z.string(),
  playerName: z.string().max(40),
  playerNumber: z.string().max(4),
  font: z.string().max(20),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  baseColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullish(),
  save: z.boolean().optional(),
});
