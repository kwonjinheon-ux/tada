import type { CSSProperties } from "react";

export type StarParticle = {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  color: string;
};

const starColors = ["#ffbd4a", "#ffd86b", "#ff9f43", "#f8c537", "#fff1aa"];

export function createStarParticles() {
  return Array.from({ length: 12 }, (_, index): StarParticle => {
    const angle = (Math.PI * 2 * index) / 12 + (Math.random() - 0.5) * 0.45;
    const distance = 34 + Math.random() * 34;
    return {
      id: `${Date.now()}-${index}-${Math.random()}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 10 - Math.random() * 18,
      delay: Math.random() * 80,
      duration: 620 + Math.random() * 300,
      size: 11 + Math.random() * 10,
      rotation: -48 + Math.random() * 96,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    };
  });
}

export function SaveStarBurst({ particles }: { particles: StarParticle[] }) {
  return <span className="save-star-particles" aria-hidden="true">
    {particles.map((particle) => (
      <span
        className="save-star-particle"
        key={particle.id}
        style={{
          "--star-x": `${particle.x}px`,
          "--star-y": `${particle.y}px`,
          "--star-delay": `${particle.delay}ms`,
          "--star-duration": `${particle.duration}ms`,
          "--star-size": `${particle.size}px`,
          "--star-rotation": `${particle.rotation}deg`,
          "--star-color": particle.color,
        } as CSSProperties}
      >
        <i className="fa-solid fa-star" />
      </span>
    ))}
  </span>;
}
