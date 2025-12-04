import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandProps = {
  variant?: "logo" | "icon" | "text";
  inverted?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  logo: {
    sm: { width: 140, height: 36 },
    md: { width: 180, height: 45 },
    lg: { width: 220, height: 56 },
  },
  icon: {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
  },
};

export function Brand({
  variant = "logo",
  inverted = false,
  size = "md",
  className,
}: BrandProps) {
  if (variant === "text") {
    return (
      <div className={cn("flex flex-col", className)}>
        <span
          className={cn(
            "font-semibold tracking-tight leading-none",
            size === "sm" && "text-base",
            size === "md" && "text-lg",
            size === "lg" && "text-xl",
            inverted ? "text-white" : "text-gray-900",
          )}
        >
          Toko
        </span>
        <span
          className={cn(
            "font-medium tracking-[0.18em] leading-none",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg",
            inverted ? "text-gray-200" : "text-gray-600",
          )}
        >
          POS
        </span>
      </div>
    );
  }

  const dimensions =
    variant === "logo" ? sizeMap.logo[size] : sizeMap.icon[size];
  const suffix = inverted ? "-inverted" : "";
  const src = `/brand/toko-pos-${variant}${suffix}.svg`;

  return (
    <Image
      src={src}
      alt="Toko POS"
      width={dimensions.width}
      height={dimensions.height}
      className={cn("flex-shrink-0", className)}
      priority={variant === "logo"}
    />
  );
}

export function BrandWithText({
  inverted = false,
  size = "md",
  className,
}: Omit<BrandProps, "variant">) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Brand variant="icon" inverted={inverted} size={size} />
      <Brand variant="text" inverted={inverted} size={size} />
    </div>
  );
}
