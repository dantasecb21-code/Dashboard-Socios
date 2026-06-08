import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEmpresa(name: string): string {
  if (!name) return "";
  let s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[.\-'&()]/g, " ")
    .replace(/\s+/g, " ");

  // Remove prepositions/articles
  s = s.replace(/\b(DO|DA|DE|DOS|DAS|E|O|A|OS|AS)\b/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // Remove trailing plural "S" from words with 4+ chars
  s = s
    .split(" ")
    .map((w) => (w.length > 3 ? w.replace(/S$/, "") : w))
    .join(" ");

  // Remove common suffixes/qualifiers that vary
  s = s
    .replace(/\bDELIVERY$/i, "")
    .replace(/\bOFICIAL$/i, "")
    .replace(/\bGOURMET$/i, "")
    .replace(/\bCOMIDA CASEIRA$/i, "")
    .replace(/\bCONGELADA?$/i, "")
    .trim();

  // Collapse spaces in numbers (1KG = 1 KG)
  s = s.replace(/(\d)\s+(KG|ML|LT|G)\b/g, "$1$2");
  s = s.replace(/(\d)(KG|ML|LT|G)\b/g, "$1$2");

  return s;
}
