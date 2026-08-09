const signals = [
  { icon: "fa-people-group", title: "Local community reach", copy: "Reach nearby residents looking for local finds." },
  { icon: "fa-calendar-days", title: "Event promotion", copy: "Make your sale easy to discover this weekend." },
  { icon: "fa-map-location-dot", title: "Interactive map", copy: "Help shoppers find the sale with confidence." },
];

export function BargainSaleTrustSignals() {
  return <section className="bargain-sale-trust-signals" aria-label="Garage sale benefits">
    {signals.map((signal) => <article key={signal.title}><i className={`fa-solid ${signal.icon}`} aria-hidden="true" /><div><strong>{signal.title}</strong><p>{signal.copy}</p></div></article>)}
  </section>;
}
