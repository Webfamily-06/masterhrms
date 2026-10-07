import React from "react";
import * as LucideIcons from "lucide-react";

interface NavIconProps {
  name: string;
  className?: string;
}

export function NavIcon({ name, className = "h-4 w-4" }: NavIconProps) {
  const IconComponent = (LucideIcons as Record<string, any>)[name] || LucideIcons.Folder;
  return <IconComponent className={className} />;
}
