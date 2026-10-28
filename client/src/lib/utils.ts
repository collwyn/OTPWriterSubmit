import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getMediaUrl(reference: string): string {
  if (reference.startsWith("http")) {
    const url = new URL(reference);
    if (url.searchParams.get("dl") === "0") {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");
    } else if (!url.searchParams.has("dl")) {
      url.searchParams.set("raw", "1");
    }
    return url.toString();
  }

  if (reference.startsWith("/")) {
    return reference;
  }

  return `/uploads/${reference}`;
}
