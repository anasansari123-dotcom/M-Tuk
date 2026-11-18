"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "starting" | "live" | "captured" | "error";

// Live photo for KYC. The picture must come from the camera, not the gallery, so the
// admin can match the face with the licence and Aadhaar photos.
// The captured JPEG is placed into a hidden <input type="file" name="selfie"> so it posts
// with the rest of the form.
export function SelfieCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("error");
      setError("This browser cannot open the camera. Open this page in Chrome or Safari on your phone.");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setPhase("live");
    } catch (cause) {
      stop();
      setPhase("error");
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "Could not open the camera. Close other apps using it and try again.",
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    // Square crop from the centre, mirrored back so text on clothing reads correctly.
    context.translate(size, 0);
    context.scale(-1, 1);
    context.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, size, size);
    canvas.toBlob(
      (blob) => {
        if (!blob || !inputRef.current) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        inputRef.current.files = transfer.files;
        setPreview(URL.createObjectURL(blob));
        setPhase("captured");
        stop();
      },
      "image/jpeg",
      0.88,
    );
  }

  function retake() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    void start();
  }

  return (
    <div className="rounded-2xl border border-dashed border-[#BFD3E4] bg-[#F7FAFC] p-4">
      <input ref={inputRef} type="file" name="selfie" accept="image/jpeg" className="sr-only" tabIndex={-1} aria-hidden />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative grid size-48 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-[#E6EEF5] shadow-[0_8px_24px_rgba(6,63,120,0.12)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className={phase === "live" || phase === "starting" ? "size-full -scale-x-100 object-cover" : "hidden"}
          />
          {phase === "captured" && preview ? (
            // Local blob preview, never leaves the browser except with the form.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your live photo" className="size-full object-cover" />
          ) : null}
          {phase === "idle" || phase === "error" ? <Camera className="size-10 text-[#71869A]" aria-hidden /> : null}
        </div>
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-sm text-[#42566A]">
            {phase === "captured"
              ? "Photo captured. Make sure your face is clear and well lit."
              : "Look straight at the camera in good light. Remove sunglasses, cap or mask."}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-[#EF2435]">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {phase === "live" ? (
              <Button type="button" onClick={capture} className="h-11 rounded-xl bg-[#00A84F] px-5 hover:bg-[#059669]">
                <Camera aria-hidden /> Capture photo
              </Button>
            ) : phase === "captured" ? (
              <>
                <span className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#E7F8EE] px-4 text-sm font-semibold text-[#00A84F]">
                  <ShieldCheck className="size-4" aria-hidden /> Live photo ready
                </span>
                <Button type="button" variant="outline" onClick={retake} className="h-11 rounded-xl">
                  <RefreshCw aria-hidden /> Retake
                </Button>
              </>
            ) : (
              <Button type="button" onClick={start} disabled={phase === "starting"} className="h-11 rounded-xl bg-[#042D58] px-5 hover:bg-[#063F78]">
                <Camera aria-hidden /> {phase === "starting" ? "Opening camera…" : phase === "error" ? "Try again" : "Open camera"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
