import en from "./messages/en";
import fr from "./messages/fr";
import type { Locale } from "./config";

/** Shape every locale must match, derived from the English dictionary. */
export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { en, fr };
