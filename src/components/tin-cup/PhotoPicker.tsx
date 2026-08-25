import { useRef } from "react";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** environment = rear (course), user = front (selfie) */
  cameraFacing?: "environment" | "user";
  className?: string;
  /** Compact row of two equal buttons */
  size?: "default" | "compact";
  cameraLabel?: string;
  libraryLabel?: string;
  /** One Photo control instead of Camera + Library. */
  single?: boolean;
};

/**
 * Dual path photo input: Take photo (capture) + Choose library (no capture).
 * iOS/Android honor capture on the camera input only.
 */
export function PhotoPicker({
  onFile,
  disabled = false,
  cameraFacing = "environment",
  className = "",
  size = "default",
  cameraLabel = "Take photo",
  libraryLabel = "Library",
  single = false,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function pick(file: File | undefined) {
    if (file) onFile(file);
  }

  const btn =
    size === "compact"
      ? "press t-micro inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-card)] border border-border px-3 text-muted-foreground disabled:opacity-50"
      : "press btn-quiet t-body inline-flex min-h-11 flex-1 items-center justify-center gap-2 disabled:opacity-50";

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture={cameraFacing}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {single ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => libraryRef.current?.click()}
          className={btn}
        >
          Photo
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => cameraRef.current?.click()}
            className={btn}
          >
            {cameraLabel}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => libraryRef.current?.click()}
            className={btn}
          >
            {libraryLabel}
          </button>
        </>
      )}
    </div>
  );
}

export function PhotoPickerIconButton({
  onFile,
  disabled,
  cameraFacing = "environment",
  label = "Add photo",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  cameraFacing?: "environment" | "user";
  label?: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <PhotoPicker
        onFile={onFile}
        disabled={disabled}
        cameraFacing={cameraFacing}
        size="compact"
        className="w-full max-w-[14rem]"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
