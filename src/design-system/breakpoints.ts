import { designTokens } from "@/design-system/tokens";

export const breakpoints = designTokens.breakpoints;
export type Breakpoint = keyof typeof breakpoints;
