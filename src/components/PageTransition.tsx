import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  direction?: "left" | "right";
}

const variants = {
  initial: (direction: string) => ({
    x: direction === "left" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: "tween" as const, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], duration: 0.35 },
  },
  exit: (direction: string) => ({
    x: direction === "left" ? "-50%" : "50%",
    opacity: 0,
    transition: { type: "tween" as const, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number], duration: 0.25 },
  }),
};

const PageTransition = ({ children, direction = "left" }: PageTransitionProps) => (
  <motion.div
    custom={direction}
    variants={variants}
    initial="initial"
    animate="animate"
    exit="exit"
    className="w-full min-h-screen"
  >
    {children}
  </motion.div>
);

export default PageTransition;
