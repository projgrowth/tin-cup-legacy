/** Crest on hunter — gold PNG’s black field drops out via screen blend. */
export function BrandMark({
  className = "",
  size = "sm",
  decorative = false,
}: {
  className?: string;
  size?: "sm" | "lg";
  decorative?: boolean;
}) {
  const box = size === "lg" ? "size-[4.5rem] rounded-xl" : "size-9 rounded-md";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-hunter ${box} ${className}`.trim()}
    >
      <img
        src="/tin-cup-logo.png"
        alt={decorative ? "" : "The Tin Cup Invitational"}
        width={size === "lg" ? 72 : 36}
        height={size === "lg" ? 72 : 36}
        aria-hidden={decorative || undefined}
        className="size-[118%] max-w-none object-contain mix-blend-screen"
      />
    </span>
  );
}
