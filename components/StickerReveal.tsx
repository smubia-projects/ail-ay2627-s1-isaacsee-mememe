"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * The signature moment: the sticker "slaps" onto the stage (scale 1.15 → 1, rotate −8° → −3°)
 * and a single lemon shine sweeps across it, clipped to the sticker's own shape.
 * `revealKey` changes once per new sticker; caption switches only crossfade the image.
 */
export function StickerReveal({ url, revealKey, alt }: { url: string; revealKey: string; alt: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={revealKey}
      className="relative w-full max-w-[400px] aspect-square mx-auto"
      initial={reduce ? { opacity: 0 } : { scale: 1.15, rotate: -8, opacity: 0 }}
      animate={reduce ? { opacity: 1 } : { scale: 1, rotate: -3, opacity: 1 }}
      transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 380, damping: 18, mass: 0.9 }}
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={url}
          src={url}
          alt={alt}
          className="absolute inset-0 w-full h-full select-none"
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      </AnimatePresence>
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(105deg, transparent 38%, rgba(255,210,63,0.85) 48%, rgba(255,255,255,0.9) 50%, rgba(255,210,63,0.85) 52%, transparent 62%)",
            backgroundSize: "300% 100%",
            backgroundRepeat: "no-repeat",
            WebkitMaskImage: `url(${url})`,
            maskImage: `url(${url})`,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            mixBlendMode: "screen",
          }}
          initial={{ backgroundPosition: "110% 0", opacity: 1 }}
          animate={{ backgroundPosition: "-10% 0", opacity: 0 }}
          transition={{ backgroundPosition: { delay: 0.18, duration: 0.45, ease: "easeInOut" }, opacity: { delay: 0.6, duration: 0.15 } }}
        />
      )}
    </motion.div>
  );
}
