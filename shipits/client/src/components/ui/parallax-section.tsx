import { ReactNode } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  className?: string;
}

export function ParallaxSection({ children, className = "" }: ParallaxSectionProps) {
  return (
    <div className={`parallax-section ${className}`}>
      {children}
    </div>
  );
}
