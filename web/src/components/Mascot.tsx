export type MascotPose = "wave" | "idle" | "point" | "stuck" | "icon";

export function Mascot({
  pose,
  className,
  alt,
}: {
  pose: MascotPose;
  className?: string;
  alt?: string;
}) {
  const icon = pose === "icon";
  return (
    // ponytail: plain <img> skips the next/image optimizer; the WebPs are already 512px wide and ≤ 60 KB.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon ? "/mascot/torob-gard-icon.webp" : `/mascot/torob-gard-mascot-${pose}.webp`}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      width={512}
      height={icon ? 512 : 768}
      draggable={false}
      className={className}
    />
  );
}
