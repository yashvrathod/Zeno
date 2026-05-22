'use client';

interface HeroGIFProps {
  src: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-32 h-32 md:w-48 md:h-48',
  md: 'w-48 h-48 md:w-64 md:h-64',
  lg: 'w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96',
};

export default function HeroGIF({ src, alt = 'Hero Animation', size = 'lg' }: HeroGIFProps) {
  return (
    <div className="relative overflow-hidden shadow-lg rounded-2xl bg-zinc-50">
      <img src={src} alt={alt} className={`${sizeMap[size]} object-contain`} draggable={false} />
    </div>
  );
}
