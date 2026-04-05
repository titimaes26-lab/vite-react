/* ═══════════════════════════════════════════════════════
   src/hooks/useBreakpoint.js
   Hook responsive + helpers de mise en page.
═══════════════════════════════════════════════════════ */
import { useState, useEffect } from "react";

export function useBreakpoint() {
  const [bp, setBp] = useState(() => ({
    w        : typeof window !== "undefined" ? window.innerWidth : 1280,
    isMobile : typeof window !== "undefined" ? window.innerWidth < 640 : false,
    isTablet : typeof window !== "undefined" ? window.innerWidth >= 640 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
    isSmall  : typeof window !== "undefined" ? window.innerWidth < 480 : false,
  }));

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp({
        w,
        isMobile : w < 640,
        isTablet : w >= 640 && w < 1024,
        isDesktop: w >= 1024,
        isSmall  : w < 480,
      });
    };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    } else {
      window.addEventListener("resize", update, { passive: true });
      return () => window.removeEventListener("resize", update);
    }
  }, []);

  return bp;
}

/** Retourne la valeur selon breakpoint : rVal(bp, mobile, tablet, desktop) */
export const rVal = (bp, mobile, tablet, desktop) =>
  bp.isMobile ? mobile : bp.isTablet ? tablet : desktop;

/** Grid columns helper */
export const rGrid = (bp, m = 1, t = 2, d = 3) =>
  `repeat(${bp.isMobile ? m : bp.isTablet ? t : d}, 1fr)`;
