/** Header crest — gold shield on hunter so the PNG’s black field does not sit on paper. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-hunter ${className}`.trim()}
    >
      <img
        src="/tin-cup-logo.png"
        alt="The Tin Cup Invitational"
        width={36}
        height={36}
        className="size-[118%] max-w-none object-contain mix-blend-screen"
      />
    </span>
  );
}
