"use client";

import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the user's OS-level "reduce motion" preference.
 *
 * Starts `false` so the server and the first client render agree — reading
 * matchMedia during render would hydration-mismatch — then updates on mount.
 *
 * Charts use this to skip their entry animation. Besides respecting the
 * accessibility setting, it makes chart rendering deterministic: recharts
 * animates bars and pie sectors up from zero, and under an automated browser
 * that tween frequently never completes, leaving the marks invisible.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setPrefersReducedMotion(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}
