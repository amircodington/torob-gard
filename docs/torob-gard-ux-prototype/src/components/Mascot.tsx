/* ==================================================================
 * TorobGardMascot — single integration point for the brand character.
 *
 * ASSET HANDOFF NOTE (important):
 * The files referenced below live in `src/assets/mascot/`. They
 * faithfully reproduce the supplied official character concept
 * (red sprout · dark-red leaves · navy backpack with brass buckles ·
 * brass compass, on #F5F4F0 backdrop).
 * >>> The original artwork files could not be located in the repo
 * filesystem, so these are faithful reproductions used as STAND-INS.
 * To integrate the ORIGINAL artwork, replace the files in
 * `src/assets/mascot/` (same names, or update the imports below) —
 * a single-file swap, no other code changes. Rendering uses
 * `object-fit: contain` with the #F5F4F0 panel (`bg-mascot`) so any
 * non-transparent original blends without visible seams.
 * ================================================================== */

import { cn } from "../utils/cn";
import waveUrl from "../assets/mascot/torob-gard-mascot-wave.webp";
import pointUrl from "../assets/mascot/torob-gard-mascot-point.webp";
import idleUrl from "../assets/mascot/torob-gard-mascot-idle.webp";
import stuckUrl from "../assets/mascot/torob-gard-mascot-stuck.webp";
import iconUrl from "../assets/mascot/torob-gard-icon.webp";

export type MascotPose = "wave" | "point" | "idle" | "stuck" | "icon";

export const MASCOT_ASSETS: Record<MascotPose, string> = {
  wave: waveUrl,   // سلام! — خوش‌آمد
  point: pointUrl, // برویم! — پلن B / راهنمایی
  idle: idleUrl,   // حالت عادی — میز تصمیم
  stuck: stuckUrl, // ؟ — خطا / حالت خالی
  icon: iconUrl,   // آیکون — آواتار گفت‌وگو
};

export function TorobGardMascot({
  pose = "idle",
  className,
  float = false,
  framed = true,
  alt,
}: {
  pose?: MascotPose;
  className?: string;
  float?: boolean;
  /** نمایش روی کادر هم‌رنگِ پس‌زمینه‌ی اثر اصلی (#F5F4F0) */
  framed?: boolean;
  alt?: string;
}) {
  return (
    <div
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt}
      className={cn(
        "overflow-hidden",
        framed && "bg-mascot rounded-3xl",
        float && "anim-float",
        className
      )}
    >
      <img
        src={MASCOT_ASSETS[pose]}
        alt={alt ?? ""}
        draggable={false}
        loading={pose === "wave" ? "eager" : "lazy"}
        className="h-full w-full object-contain select-none"
      />
    </div>
  );
}

/** آواتار کوچک پیام‌های دستیار — همان آیکون اصلی، بدون بریدگی */
export function MascotAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-2xl bg-mascot ring-1 ring-line",
        className
      )}
    >
      <img
        src={MASCOT_ASSETS.icon}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
    </div>
  );
}
