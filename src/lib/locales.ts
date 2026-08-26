/** The locale list, kept out of LanguageProvider so the server can read it.
 *
 *  LanguageProvider is a "use client" module: importing a value from it into a
 *  server component hands back a client-reference proxy rather than the array,
 *  so `supportedLocales.includes(...)` throws at request time while the build
 *  and the type-checker both stay quiet. */
export const supportedLocales = ["en", "ko", "zh", "ja", "es", "hi", "ar"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const isSupportedLocale = (value: unknown): value is SupportedLocale =>
  typeof value === "string" && (supportedLocales as readonly string[]).includes(value);
