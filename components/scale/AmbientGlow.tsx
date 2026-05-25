interface AmbientGlowProps {
  mouse: { x: number; y: number };
}

export default function AmbientGlow({ mouse }: AmbientGlowProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="w-[300px] h-[200px] sm:w-[500px] sm:h-[300px] lg:w-[700px] lg:h-[400px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(ellipse at center,rgba(100,140,255,0.4) 0%,transparent 70%)",
          filter: "blur(60px)",
          transform: `translate(${mouse.x * 18}px,${mouse.y * 10}px)`,
          transition: "transform 0.4s ease-out",
        }}
      />
    </div>
  );
}
