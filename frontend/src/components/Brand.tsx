import { cn } from "@/lib/utils";
import iconUrl from "@/assets/ICONO_CONEXUS_RUGBY.svg";
import textUrl from "@/assets/TEXTO_CONEXUS_RUGBY.svg";

type BrandVariant = "sm" | "md" | "lg" | "xl" | "header" | "login";

type BrandProps = {
  className?: string;
  variant?: BrandVariant;
  shadow?: boolean;
};

const sizes: Record<BrandVariant, { icon: number; text: number; gap: string }> = {
  sm: { icon: 32, text: 16, gap: "gap-2" },
  md: { icon: 46, text: 22, gap: "gap-3" },
  lg: { icon: 62, text: 30, gap: "gap-4" },
  xl: { icon: 80, text: 38, gap: "gap-4" },
  header: { icon: 90, text: 100, gap: "gap-3" },
  login: { icon: 110, text: 140, gap: "gap-4" },
};

const sizeStyles = (variant: BrandVariant) => ({
  icon: { height: sizes[variant].icon, width: sizes[variant].icon },
  text: { height: sizes[variant].text },
  gap: sizes[variant].gap,
});

export const BrandIcon = ({ className, variant = "md", shadow = true }: BrandProps) => (
  <img
    src={iconUrl}
    alt="Conexus Rugby"
    style={sizeStyles(variant).icon}
    className={cn(shadow ? "drop-shadow-lg" : "", className)}
  />
);

export const BrandText = ({ className, variant = "md", shadow = true }: BrandProps) => (
  <img
    src={textUrl}
    alt="Conexus Rugby"
    style={sizeStyles(variant).text}
    className={cn(shadow ? "drop-shadow-lg" : "", className)}
  />
);

export const BrandLockup = ({ className, variant = "md", shadow = true }: BrandProps) => {
  const sizesForVariant = sizeStyles(variant);
  return (
    <div className={cn("flex items-center", sizesForVariant.gap, className)}>
      <BrandIcon variant={variant} shadow={shadow} />
      <BrandText variant={variant} shadow={shadow} />
    </div>
  );
};
