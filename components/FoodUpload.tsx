"use client";

import { useEffect, useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/options";
import { CameraIcon, UploadIcon } from "./Icons";

function fileAllowed(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/jpg" || ACCEPTED_IMAGE_TYPES.includes(type)) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "webp";
}

export function FoodUpload({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null, message?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const [trackedFile, setTrackedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  if (file !== trackedFile) {
    setTrackedFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }, [cameraOpen]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }

  function report(message: string) {
    onFileChange(file, message);
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      report("This browser cannot open a camera. Upload a photo instead.");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch (error) {
        if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
          throw error;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      report(
        denied
          ? "Camera access was blocked. Allow camera permission, or upload a photo instead."
          : "No camera was found on this device. Upload a photo instead.",
      );
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      report("The camera is not ready yet. Hold the label steady and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      report("We couldn't capture that photo. Try again.");
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          report("We couldn't capture that photo. Try again.");
          return;
        }
        const photo = new File([blob], "food-label.jpg", { type: "image/jpeg" });
        stopCamera();
        acceptFile(photo);
      },
      "image/jpeg",
      0.92,
    );
  }

  function acceptFile(next: File | null) {
    if (!next) {
      onFileChange(null);
      return;
    }
    if (!fileAllowed(next)) {
      onFileChange(null, "Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      onFileChange(null, "That image is too large. Please use a photo under 5 MB.");
      return;
    }
    onFileChange(next);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          stopCamera();
          acceptFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      {cameraOpen ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[420px] w-full bg-[#102216] object-contain"
          />
          <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">Hold the ingredient label steady, then capture the photo.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-dark"
              >
                Capture photo
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent-dark"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : preview ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          {/* Blob previews cannot go through next/image without extra config. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected food label" className="max-h-[420px] w-full object-contain bg-[#f7faf6]" />
          <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{file?.name}</p>
              <p className="text-sm text-muted">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startCamera()}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent-dark"
              >
                <CameraIcon />
                Scan with camera
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent-dark"
              >
                Upload another
              </button>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                Remove image
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFile(event.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragging ? "border-accent bg-accent-soft" : "border-[#c9dccf] bg-white hover:border-accent hover:bg-[#f7faf6]"
          }`}
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <UploadIcon />
          </span>
          <span className="mt-4 text-base font-semibold text-foreground">
            Drag and drop a label photo, or click to upload
          </span>
          <span className="mt-2 text-sm text-muted">JPG, JPEG, PNG, or WEBP up to 5 MB</span>
        </button>
      )}

      {!cameraOpen && !preview && (
        <div className="mt-4">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3.5 text-sm font-semibold text-foreground transition hover:border-accent hover:text-accent-dark"
          >
            <CameraIcon />
            Scan with camera
          </button>
        </div>
      )}
    </div>
  );
}
