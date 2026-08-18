// Font Awesome's arrows are hairline strokes, so the chunky rounded vote arrow
// is drawn here instead. One path serves both directions, rotated in SVG user
// units rather than by CSS so the origin does not depend on transform-box.
export function CommunityVoteArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg className={`community-vote-arrow is-${direction}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3.8 20.6 12.4 15.4 12.4 15.4 20.2 8.6 20.2 8.6 12.4 3.4 12.4Z" transform={direction === "down" ? "rotate(180 12 12)" : undefined} />
    </svg>
  );
}
