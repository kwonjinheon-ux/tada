const avatarColors = [
  "#ef4444", "#f97316", "#f59e0b", "#84a00a", "#22a06b",
  "#14b8a6", "#0891b2", "#2563eb", "#4f46e5", "#7c3aed",
  "#a855f7", "#c026d3", "#db2777", "#e11d48", "#b45309",
  "#65a30d", "#0f766e", "#0369a1", "#4338ca", "#9d174d",
] as const;

export function getAvatarFallback(name?: string | null) {
  const label = name?.trim() || "Tada User";
  const initial = label.charAt(0).toUpperCase();
  const colorIndex = Array.from(label).reduce((total, character) => total + character.charCodeAt(0), 0) % avatarColors.length;
  return { initial, color: avatarColors[colorIndex] };
}
