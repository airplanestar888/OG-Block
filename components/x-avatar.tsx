"use client";

import Image from "next/image";
import { useState } from "react";

// Avatar with graceful fallback: if the stored X image URL is dead (user
// changed handle/pfp and hasn't re-logged in), show the handle initial
// instead of a broken image.
export function XAvatar({
  src,
  handle,
  size
}: {
  src: string | null;
  handle: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <Image
        className="rounded-full object-cover"
        src={src}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
        unoptimized
      />
    );
  }

  return (
    <div
      className="grid rounded-full bg-black/10 font-semibold text-black/50"
      style={{ width: size, height: size, placeItems: "center" }}
    >
      {handle.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}
