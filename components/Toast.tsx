"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div aria-live="polite" className="fixed inset-x-0 bottom-28 lg:bottom-8 z-50 flex justify-center pointer-events-none">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-full bg-ink text-paper px-4 py-2 text-sm font-semibold"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
