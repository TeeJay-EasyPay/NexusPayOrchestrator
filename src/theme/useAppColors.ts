import { usePersona } from "../state/PersonaContext";
import { isCorporatePersona } from "../services/corporateAccessService";
import { colors } from "./colors";
export const corporatePalette = { navy: "#102332", canvas: "#F6F5F1", ink: "#102332", muted: "#647486", teal: "#087F83", border: "#E4E7EB", tint: "#E0F0EE" };
const corporateColors = { ...colors, background: corporatePalette.canvas, backgroundSoft: corporatePalette.tint, cardSoft: "#F6F5F1", cardBorder: corporatePalette.border, gold: corporatePalette.teal, goldSoft: corporatePalette.tint, textPrimary: corporatePalette.ink, textSecondary: corporatePalette.muted, textMuted: corporatePalette.muted, textDarkPrimary: corporatePalette.ink, textDarkSecondary: corporatePalette.muted, border: corporatePalette.border };
export function useAppColors() { const { selectedPersona } = usePersona(); return isCorporatePersona(selectedPersona) ? corporateColors : colors; }
