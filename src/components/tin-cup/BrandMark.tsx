/** Bronze 3D medal — object mark only (The Card, purse). Not the 40px header. */
export function MedalMark({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "md" ? "size-14" : "size-10";
  const px = size === "md" ? 56 : 40;
  return (
    <img
      src="/tin-cup-medal.png"
      alt=""
      width={px}
      height={px}
      className={`inline-block shrink-0 object-contain ${box} ${className}`.trim()}
    />
  );
}

/** Crest in hunter ink on paper — luminance of the gold PNG is the mask. */
export function BrandMark({
  className = "",
  size = "sm",
  decorative = false,
}: {
  className?: string;
  size?: "sm" | "lg";
  decorative?: boolean;
}) {
  const box = size === "lg" ? "size-[4.5rem]" : "size-10";
  return (
    <span className={`relative inline-flex shrink-0 ${box} ${className}`.trim()}>
      <span
        aria-hidden
        className="absolute inset-0 bg-hunter"
        style={{
          maskImage: "url(/tin-cup-logo.png)",
          WebkitMaskImage: "url(/tin-cup-logo.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <img
        src="/tin-cup-logo.png"
        alt={decorative ? "" : "The Tin Cup Invitational"}
        width={size === "lg" ? 72 : 40}
        height={size === "lg" ? 72 : 40}
        aria-hidden={decorative || undefined}
        className="relative size-full object-contain opacity-0"
      />
    </span>
  );
}
