"use client";

import Header from "@/components/layout/Header";
import { useEffect, useRef, useState } from "react";
import {
  Video,
  Upload,
  Download,
  Wand2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const PROVIDERS = [
  {
    id: "luma",
    name: "Luma Dream Machine",
    badge: "Active",
    cost: 20,
    maxDuration: 9,
    desc: "Ray 2 photorealistic video generation",
    color: "#06b6d4",
  },
];

const CAMERAS = [
  "None",
  "Pan Left",
  "Pan Right",
  "Zoom In",
  "Zoom Out",
  "Orbit Left",
  "Orbit Right",
  "Tilt Up",
  "Tilt Down",
  "Crane Up",
];

export default function VideoGenerationPage() {
  const [prompt, setPrompt] = useState("");
  const [provider] = useState("luma");
  const [duration, setDuration] = useState(5);
  const [camera, setCamera] = useState("None");

  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [mode, setMode] = useState<"text" | "image">("text");
  const [imageUrl, setImageUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sel = PROVIDERS.find((p) => p.id === provider)!;

  useEffect(() => {
    if (!generationId || !loading) return;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/video-status?id=${encodeURIComponent(generationId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to check video status");
        }

        if (cancelled) return;

        setStatus(data.state || "dreaming");

        if (data.state === "completed") {
          setVideoUrl(data.videoUrl || "");
          setLoading(false);
          setStatus("completed");
          return;
        }

        if (data.state === "failed") {
          setError(data.failureReason || "Luma video generation failed.");
          setLoading(false);
          setStatus("failed");
          return;
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Video status error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to check video generation status."
        );

        setLoading(false);
      }
    };

    pollStatus();

    const interval = setInterval(pollStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [generationId, loading]);

  const generate = async () => {
    const cleanPrompt = prompt.trim();

    if (!cleanPrompt) {
      setError("Please enter a video prompt.");
      return;
    }

    if (cleanPrompt.length < 3) {
      setError("Prompt must contain at least 3 characters.");
      return;
    }

    setLoading(true);
    setVideoUrl("");
    setGenerationId("");
    setError("");
    setStatus("creating");

    try {
      let finalPrompt = cleanPrompt;

      if (camera !== "None") {
        finalPrompt += `. Camera motion: ${camera}.`;
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          duration,
          imageUrl: mode === "image" ? imageUrl : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video generation failed.");
      }

      if (!data.id) {
        throw new Error("Luma did not return a generation ID.");
      }

      setGenerationId(data.id);
      setStatus(data.state || "dreaming");
    } catch (err) {
      console.error("Generate video error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating the video."
      );

      setLoading(false);
      setStatus("failed");
    }
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB.");
      return;
    }

    setError("");

    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
  };

  const resetGeneration = () => {
    setPrompt("");
    setVideoUrl("");
    setGenerationId("");
    setError("");
    setStatus("");
    setImageUrl("");
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header title="AI Video Generation" />

      <div className="flex h-[calc(100vh-57px)]">
        {/* LEFT PANEL */}
        <div
          className="w-80 shrink-0 overflow-y-auto p-4 space-y-5"
          style={{
            borderRight: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}
        >
          {/* MODE */}
          <div
            className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--border)" }}
          >
            {(["text", "image"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className="flex-1 py-2.5 text-sm font-semibold transition-all"
                style={{
                  background:
                    mode === m
                      ? "rgba(124,58,237,0.2)"
                      : "transparent",
                  color:
                    mode === m ? "#a78bfa" : "var(--text-muted)",
                }}
              >
                {m === "text" ? "Text to Video" : "Image to Video"}
              </button>
            ))}
          </div>

          {/* PROVIDER */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              AI Provider
            </label>

            <button
              className="w-full text-left p-3 rounded-xl border"
              style={{
                background: "rgba(124,58,237,0.12)",
                borderColor: "rgba(124,58,237,0.5)",
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">
                  {sel.name}
                </span>

                <span
                  className="text-xs px-2 py-1 rounded-md"
                  style={{
                    background: `${sel.color}20`,
                    color: sel.color,
                    border: `1px solid ${sel.color}40`,
                  }}
                >
                  {sel.badge}
                </span>
              </div>

              <div className="flex justify-between">
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {sel.desc}
                </span>

                <span
                  className="text-xs font-medium"
                  style={{ color: "#fbbf24" }}
                >
                  {sel.cost}cr
                </span>
              </div>
            </button>
          </div>

          {/* DURATION */}
          <div>
            <div className="flex justify-between mb-2">
              <label
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                Duration
              </label>

              <span className="text-sm font-bold text-white">
                {duration}s
              </span>
            </div>

            <input
              type="range"
              min={5}
              max={sel.maxDuration}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-violet-500"
              disabled={loading}
            />

            <div
              className="flex justify-between text-xs mt-1"
              style={{ color: "var(--text-muted)" }}
            >
              <span>5s</span>
              <span>{sel.maxDuration}s max</span>
            </div>
          </div>

          {/* CAMERA */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Camera Motion
            </label>

            <div className="flex flex-wrap gap-1.5">
              {CAMERAS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCamera(c)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg text-xs border transition-all"
                  style={{
                    background:
                      camera === c
                        ? "rgba(124,58,237,0.15)"
                        : "transparent",
                    borderColor:
                      camera === c
                        ? "rgba(124,58,237,0.5)"
                        : "var(--border)",
                    color:
                      camera === c
                        ? "#a78bfa"
                        : "var(--text-muted)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* COST */}
          <div
            className="rounded-xl p-3 text-xs"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <div className="flex justify-between">
              <span style={{ color: "var(--text-muted)" }}>
                Cost
              </span>

              <span
                style={{ color: "#fbbf24" }}
                className="font-bold"
              >
                {sel.cost} credits
              </span>
            </div>

            <div className="flex justify-between mt-1">
              <span style={{ color: "var(--text-muted)" }}>
                Model
              </span>

              <span className="font-bold text-white">
                Ray 2
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* PROMPT AREA */}
          <div
            className="p-4 space-y-3"
            style={{
              borderBottom: "1px solid var(--border)",
            }}
          >
            {mode === "image" && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-muted)",
                  }}
                  disabled={loading}
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt="Selected image"
                        className="max-h-48 rounded-lg object-contain"
                      />

                      <span className="text-sm">
                        Click to change image
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={24} />

                      <p className="text-sm">
                        Click to select an image
                      </p>

                      <p className="text-xs">
                        JPG, PNG, WEBP — max 10MB
                      </p>
                    </>
                  )}
                </button>

                <p className="text-xs mt-2 text-yellow-400">
                  Image-to-video requires a publicly accessible image
                  URL. A local browser image cannot be sent directly to
                  Luma.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create..."
                rows={3}
                disabled={loading}
                className="input flex-1 resize-none"
              />

              <button
                onClick={generate}
                disabled={
                  !prompt.trim() ||
                  loading ||
                  (mode === "image" && !imageUrl)
                }
                className="btn-primary px-5 self-stretch"
                style={{ minWidth: 120 }}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <Video size={15} />
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-xl p-3 text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                }}
              >
                <AlertCircle
                  size={18}
                  className="shrink-0 mt-0.5"
                />

                <span>{error}</span>
              </div>
            )}

            {/* STATUS */}
            {loading && (
              <div
                className="flex items-center gap-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />

                {status === "creating"
                  ? "Sending request to Luma..."
                  : "Luma is generating your video..."}
              </div>
            )}
          </div>

          {/* OUTPUT */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
            {loading ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto" />

                <div>
                  <p className="font-bold text-white text-lg">
                    Generating your video...
                  </p>

                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Luma Ray 2 · {duration}s
                  </p>

                  {generationId && (
                    <p
                      className="text-xs mt-2 break-all"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ID: {generationId}
                    </p>
                  )}
                </div>

                <div className="progress-bar w-64 mx-auto">
                  <div
                    className="progress-fill animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            ) : videoUrl ? (
              <div className="w-full max-w-3xl space-y-4">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle2 size={18} />
                  Video generated successfully
                </div>

                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-2xl"
                  style={{
                    border: "1px solid var(--border)",
                  }}
                />

                <div className="flex gap-3 justify-center">
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary px-6"
                  >
                    <Download size={15} />
                    Open / Download
                  </a>

                  <button
                    className="btn-secondary px-6"
                    onClick={resetGeneration}
                  >
                    <Wand2 size={15} />
                    Generate Another
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="text-center"
                style={{ color: "var(--text-muted)" }}
              >
                <Video
                  size={64}
                  className="opacity-20 mx-auto mb-4"
                />

                <p
                  className="text-lg font-semibold"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  Your video appears here
                </p>

                <p className="text-sm mt-1">
                  Choose Luma, write a prompt, and generate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}