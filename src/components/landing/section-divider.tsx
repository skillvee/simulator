/**
 * Smooth wave dividers for seamless section transitions
 * Creates visual flow between sections with different backgrounds
 */

interface DividerProps {
  className?: string;
  fillColor?: string;
}

/**
 * Gentle wave divider - use at bottom of sections
 */
export function WaveDivider({ className = "", fillColor = "fill-white" }: DividerProps) {
  return (
    <div className={`absolute bottom-0 left-0 right-0 overflow-hidden leading-none ${className}`}>
      <svg
        className="relative block w-full h-12 sm:h-16 lg:h-20"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
          className={fillColor}
        />
      </svg>
    </div>
  );
}

/**
 * Inverted wave - use at top of sections
 */
export function WaveDividerTop({ className = "", fillColor = "fill-white" }: DividerProps) {
  return (
    <div className={`absolute top-0 left-0 right-0 overflow-hidden leading-none rotate-180 ${className}`}>
      <svg
        className="relative block w-full h-12 sm:h-16 lg:h-20"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
          className={fillColor}
        />
      </svg>
    </div>
  );
}

/**
 * Subtle curve divider - less dramatic than wave
 */
export function CurveDivider({ className = "", fillColor = "fill-white" }: DividerProps) {
  return (
    <div className={`absolute bottom-0 left-0 right-0 overflow-hidden leading-none ${className}`}>
      <svg
        className="relative block w-full h-10 sm:h-14 lg:h-16"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 Q600,20 1200,80 L1200,120 L0,120 Z"
          className={fillColor}
        />
      </svg>
    </div>
  );
}

/**
 * Gradient fade divider - pure CSS, no SVG
 */
export function GradientDivider({
  className = "",
  from = "from-transparent",
  to = "to-white"
}: { className?: string; from?: string; to?: string }) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b ${from} ${to} pointer-events-none ${className}`}
    />
  );
}
