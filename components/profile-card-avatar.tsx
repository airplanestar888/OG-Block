"use client";

import { useState } from "react";

// Avatar for the dark public-profile card. Falls back to the handle initial
// when no image URL is stored OR when the stored image fails to load (dead
// pfp after a handle/avatar change) — mirroring the leaderboard's XAvatar.
export function ProfileCardAvatar({
  src,
  handle
}: {
  src: string | null;
  handle: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (handle || "?").charAt(0).toUpperCase();

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={handle}
        onError={() => setFailed(true)}
        className="size-16 shrink-0 rounded-full border-2 border-white/20 object-cover"
      />
    );
  }

  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-full border-2 border-white/20 bg-white/10 text-2xl font-bold">
      {initial}
    </div>
  );
}
