interface HeroTextProps {
  mounted: boolean;
}

export default function HeroText({ mounted }: HeroTextProps) {
  return (
    <div
      className="text-center w-full max-w-[300px] sm:max-w-md md:max-w-xl"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.8s ease 0.3s,transform 0.8s ease 0.3s",
      }}
    >
      <h1
        className="text-white text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-3 sm:mb-4"
        style={{ letterSpacing: "-0.02em" }}
      >
        Reliable AI has no shortcuts.
      </h1>
      <p className="text-[#777] text-sm sm:text-base md:text-[17px] leading-relaxed">
        Scale works across the AI stack, from the data that trains the models
        you rely on, to the systems that put them to work. Humans stay in the
        loop.
      </p>
    </div>
  );
}
