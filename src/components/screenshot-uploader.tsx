"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { IMAGE_PHASES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PendingImage = { url: string; caption: string; phase: string };

const MAX_IMAGES = 12;
const MAX_BYTES = 3 * 1024 * 1024; // 3MB per screenshot after downscaling

/**
 * Screenshots are downscaled in the browser and stored as data URLs on the
 * trade record, which keeps the app dependency-free of an object store.
 */
export function ScreenshotUploader({
  images,
  onChange,
}: {
  images: PendingImage[];
  onChange: (next: PendingImage[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const accepted = [...files].filter((file) => file.type.startsWith("image/"));
      if (!accepted.length) return;

      const room = MAX_IMAGES - images.length;
      if (room <= 0) {
        setError(`Up to ${MAX_IMAGES} screenshots per trade`);
        return;
      }

      const next: PendingImage[] = [];
      for (const file of accepted.slice(0, room)) {
        try {
          const url = await downscale(file);
          if (url.length > MAX_BYTES) {
            setError(`${file.name} is too large even after resizing`);
            continue;
          }
          next.push({ url, caption: "", phase: "OTHER" });
        } catch {
          setError(`Could not read ${file.name}`);
        }
      }

      if (next.length) onChange([...images, ...next]);
    },
    [images, onChange],
  );

  const update = (index: number, patch: Partial<PendingImage>) => {
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-line hover:border-accent/50",
        )}
      >
        <Upload size={20} className="text-ink-faint" />
        <p className="text-sm font-medium">Drop chart screenshots here</p>
        <p className="text-xs text-ink-faint">
          or click to browse · PNG, JPG, WebP · up to {MAX_IMAGES} images
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-xs text-down">{error}</p> : null}

      {images.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <div key={index} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.caption || "Trade screenshot"} className="h-32 w-full object-cover" />
              <div className="space-y-2 p-2.5">
                <select
                  value={image.phase}
                  onChange={(e) => update(index, { phase: e.target.value })}
                  className="field py-1 text-xs"
                >
                  {IMAGE_PHASES.map((phase) => (
                    <option key={phase} value={phase}>
                      {phaseLabel(phase)}
                    </option>
                  ))}
                </select>
                <input
                  value={image.caption}
                  onChange={(e) => update(index, { caption: e.target.value })}
                  placeholder="Caption"
                  className="field py-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="btn btn-danger w-full py-1 text-xs"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-ink-faint">
          <ImagePlus size={13} /> No screenshots attached yet
        </p>
      )}
    </div>
  );
}

export function phaseLabel(phase: string) {
  switch (phase) {
    case "BEFORE":
      return "Before entry";
    case "ENTRY":
      return "At entry";
    case "DURING":
      return "During trade";
    case "EXIT":
      return "After exit";
    case "HTF":
      return "Higher timeframe";
    default:
      return "Other";
  }
}

/** Resizes to a max edge of 1600px and re-encodes as JPEG to keep payloads small. */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode failed"));
      image.onload = () => {
        const maxEdge = 1600;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("canvas unavailable"));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
