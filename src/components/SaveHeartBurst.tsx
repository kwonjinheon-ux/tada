"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type HeartParticle = {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  color: string;
};

export const saveFeedbackClasses = {
  root: "save-feedback",
  saved: "is-saved",
  popping: "is-popping",
} as const;

export function useSaveHeartFeedback() {
  const [isPopping, setIsPopping] = useState(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const burstTimer = useRef<number | null>(null);
  const popTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
  }, []);

  const play = useCallback(() => {
    setIsPopping(false);
    setHeartParticles(createHeartParticles());
    window.requestAnimationFrame(() => setIsPopping(true));
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    if (popTimer.current) window.clearTimeout(popTimer.current);
    popTimer.current = window.setTimeout(() => setIsPopping(false), 440);
    burstTimer.current = window.setTimeout(() => setHeartParticles([]), 1_050);
  }, []);

  return { heartParticles, isPopping, play, stopPopping: () => setIsPopping(false) };
}

const heartColors = ["#ff3b6b", "#ff5d8f", "#ff8a5b", "#ffbd4a", "#e94683"];

// The shared save control clips this feedback to its own bounds so a burst
// never paints over neighbouring page content.
export function createHeartParticles() {
  return Array.from({ length: 12 }, (_, index): HeartParticle => {
    const angle = (Math.PI * 2 * index) / 12 + (Math.random() - 0.5) * 0.45;
    const distance = 20 + Math.random() * 18;
    return {
      id: `${Date.now()}-${index}-${Math.random()}`,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 6 - Math.random() * 10,
      delay: Math.random() * 80,
      duration: 620 + Math.random() * 300,
      size: 11 + Math.random() * 10,
      rotation: -48 + Math.random() * 96,
      color: heartColors[Math.floor(Math.random() * heartColors.length)],
    };
  });
}

export function SaveHeartBurst({ particles }: { particles: HeartParticle[] }) {
  return <span className="save-heart-particles" aria-hidden="true">
    {particles.map((particle) => (
      <span
        className="save-heart-particle"
        key={particle.id}
        style={{
          "--heart-x": `${particle.x}px`,
          "--heart-y": `${particle.y}px`,
          "--heart-delay": `${particle.delay}ms`,
          "--heart-duration": `${particle.duration}ms`,
          "--heart-size": `${particle.size}px`,
          "--heart-rotation": `${particle.rotation}deg`,
          "--heart-color": particle.color,
        } as CSSProperties}
      >
        <i className="fa-solid fa-heart" />
      </span>
    ))}
  </span>;
}

export function SaveHeartIcon({ isSaved, particles }: { isSaved: boolean; particles: HeartParticle[] }) {
  return <><i className={`${isSaved ? "fa-solid" : "fa-regular"} fa-heart`} aria-hidden="true" /><SaveHeartBurst particles={particles} /></>;
}
