/** Bronze 3D medal — object mark only. Not the header crest. */
export function MedalMark({
  className = "",
  size = "sm",
}: {
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const box = size === "md" ? "size-14" : size === "xs" ? "size-8" : "size-10";
  const px = size === "md" ? 56 : size === "xs" ? 32 : 40;
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

const CREST = {
  xs: { box: "size-8", px: 32, round: "rounded-[0.55rem]" },
  sm: { box: "size-10", px: 40, round: "rounded-[0.7rem]" },
  md: { box: "size-14", px: 56, round: "rounded-[0.9rem]" },
  lg: {
    box: "size-[7.25rem] sm:size-36",
    px: 144,
    round: "rounded-[1.35rem]",
  },
} as const;

/**
 * Official crest PNG in a black well. Header uses xs; letterhead uses lg.
 */
export function BrandMark({
  className = "",
  size = "sm",
  decorative = false,
}: {
  className?: string;
  size?: keyof typeof CREST;
  decorative?: boolean;
}) {
  const { box, px, round } = CREST[size];
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden bg-black ring-1 ring-foreground/12 ${round} ${box} ${className}`.trim()}
    >
      <img
        src="/tin-cup-logo.png"
        alt={decorative ? "" : "The Tin Cup Invitational"}
        width={px}
        height={px}
        aria-hidden={decorative || undefined}
        className="relative size-full object-contain object-center"
      />
    </span>
  );
}
