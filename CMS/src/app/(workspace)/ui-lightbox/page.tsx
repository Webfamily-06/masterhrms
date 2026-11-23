"use client";

import React, { useState } from "react";
import { PreviewCard } from "@/components/ui/preview-card";

interface GalleryImage {
  id: number;
  src: string;
  title: string;
  category: string;
}

export default function UILightboxPage() {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const images: GalleryImage[] = [
    { id: 1, src: "/assets/img/avatar/avatar-02.jpg", title: "Executive Leadership Summit", category: "Corporate Events" },
    { id: 2, src: "/assets/img/avatar/avatar-04.jpg", title: "Engineering All-Hands", category: "Campus" },
    { id: 3, src: "/assets/img/avatar/avatar-06.jpg", title: "Q3 Hackathon Winners", category: "Awards" },
    { id: 4, src: "/assets/img/avatar/avatar-08.jpg", title: "New Bengaluru Facility Launch", category: "Infrastructure" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Lightbox Gallery</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Image gallery with modal light-dismiss lightbox for zoom previews, asset verification, and company media.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            Advanced UI Component
          </span>
        </div>
      </div>

      <PreviewCard
        title="Interactive Lightbox Gallery Grid"
        description="Click any gallery card to launch the high-resolution lightbox modal overlay."
        code={`<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {images.map(img => (
    <div key={img.id} onClick={() => setSelected(img)} className="cursor-pointer">
      <img src={img.src} className="rounded-lg hover:scale-105" />
    </div>
  ))}
</div>`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
          {images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className="group relative rounded-xl overflow-hidden border border-border/80 bg-card shadow-xs cursor-pointer hover:border-primary transition-all duration-200"
            >
              <div className="aspect-square w-full overflow-hidden bg-muted">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="p-2.5">
                <h5 className="font-semibold text-xs text-foreground truncate">{img.title}</h5>
                <p className="text-[10px] text-muted-foreground mt-0.5">{img.category}</p>
              </div>
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <span className="p-2 rounded-full bg-slate-950/70 shadow-lg">
                  <i className="ph ph-magnifying-glass-plus text-base" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </PreviewCard>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedImage(null)}
          />
          <div className="relative z-10 max-w-xl w-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center">
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-3 right-3 size-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="ph ph-x text-sm" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between border-t border-border/60">
              <div>
                <h4 className="font-bold text-sm text-foreground">{selectedImage.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedImage.category}</p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">ID #{selectedImage.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
