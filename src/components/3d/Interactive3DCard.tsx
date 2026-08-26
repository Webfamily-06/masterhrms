import React, { useRef, useState } from "react";

interface Interactive3DCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export function Interactive3DCard({
  children,
  className = "",
  glowColor = "rgba(168, 85, 247, 0.4)",
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -12;
    const rY = ((x - centerX) / centerX) * 12;

    setRotateX(rX);
    setRotateY(rY);

    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      style={{ perspective: "1000px" }}
      className="w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={cardRef}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.02 : 1}, ${isHovered ? 1.02 : 1}, 1)`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.5s ease-out",
          boxShadow: isHovered
            ? `0 20px 40px -15px ${glowColor}, 0 0 20px -5px ${glowColor}`
            : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        className={`relative w-full h-full rounded-3xl transition-shadow duration-300 overflow-hidden ${className}`}
      >
        {/* Dynamic Holographic Specular Glare */}
        <div
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.18) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-10"
        />

        {/* Content */}
        <div className="relative z-0 h-full">{children}</div>
      </div>
    </div>
  );
}
