"use client";

import { useState } from "react";

type ShowreelVideo = {
  title: string;
  src: string;
};

type VideoShowreelProps = {
  videos: ShowreelVideo[];
  label: string;
};

export function VideoShowreel({ videos, label }: VideoShowreelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeVideo = videos[activeIndex] ?? videos[0];

  if (!activeVideo) {
    return null;
  }

  return (
    <div className="space-y-3">
      <video
        key={activeVideo.src}
        aria-label={label}
        className="aspect-video w-full rounded-lg bg-black object-cover"
        autoPlay
        muted
        playsInline
        controls
        preload="metadata"
        onEnded={() => setActiveIndex((current) => (current + 1) % videos.length)}
      >
        <source src={activeVideo.src} type="video/mp4" />
      </video>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#243244]">{activeVideo.title}</p>
        <div className="flex gap-2" aria-label="Showreel clips">
          {videos.map((video, index) => (
            <button
              key={video.src}
              type="button"
              aria-label={`Play ${video.title}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 w-8 rounded-full transition ${
                index === activeIndex ? "bg-[#8b1e2d]" : "bg-[#cbd5e1] hover:bg-[#94a3b8]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
