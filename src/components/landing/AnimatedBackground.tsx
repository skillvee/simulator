/**
 * Subtle static background with blue and amber gradient glows
 * Matches brand colors - blue primary, amber accent
 */
export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      {/* Primary blue gradient - top right */}
      <div
        className="absolute w-[900px] h-[900px]"
        style={{
          top: "-200px",
          right: "-100px",
          background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 40%, transparent 65%)",
        }}
      />

      {/* Amber accent gradient - bottom left, adds warmth */}
      <div
        className="absolute w-[600px] h-[600px]"
        style={{
          bottom: "-150px",
          left: "-100px",
          background: "radial-gradient(circle at center, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.04) 40%, transparent 65%)",
        }}
      />

      {/* Soft blue gradient - bottom center for depth */}
      <div
        className="absolute w-[700px] h-[700px]"
        style={{
          bottom: "0",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, rgba(147, 197, 253, 0.06) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
