import Image from "next/image";

// public/scc-logo.png is 512×409 — generated from app/scc.png by cropping to the
// mark's bounding box, keying white to transparent, and resizing to 512px on the
// long edge. Update this if the asset is ever regenerated at a different ratio.
const LOGO_ASPECT_RATIO = 409 / 512;

interface LogoProps {
  size: number;
  decorative?: boolean;
  preload?: boolean;
  className?: string;
}

export function Logo({ size, decorative = false, preload = false, className }: LogoProps) {
  return (
    <Image
      src="/scc-logo.png"
      alt={decorative ? "" : "Solace of Christ Church"}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={Math.round(size * LOGO_ASPECT_RATIO)}
      preload={preload}
      className={className}
    />
  );
}
