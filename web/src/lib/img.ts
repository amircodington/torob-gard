const TOROB = "https://image.torob.com";

/** Torob image URLs through NEXT_PUBLIC_IMG_BASE (prod: «/img», proxied and cached by nginx; R-P7). */
export const img = (url: string): string => url.replace(TOROB, process.env.NEXT_PUBLIC_IMG_BASE ?? TOROB);
