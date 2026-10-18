"use client";

import { MotionConfig } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { BlockedCard } from "@/components/BlockedCard";
import { CaptionOptions } from "@/components/CaptionOptions";
import { ConsentBox } from "@/components/ConsentBox";
import { StylePicker, VibePicker } from "@/components/Pickers";
import { ProgressSteps, freshStages, type StageId, type StageState } from "@/components/ProgressSteps";
import { StepIndicator } from "@/components/StepIndicator";
import { StickerReveal } from "@/components/StickerReveal";
import { StickerSheet, type SheetItem } from "@/components/StickerSheet";
import { Toast } from "@/components/Toast";
import { Uploader, type Photo } from "@/components/Uploader";
import { ApiError, postJson } from "@/lib/api";
import { canvasToBlob, composeSticker, ensureFonts } from "@/lib/canvas/compose";
import { dieCutSticker, roundedPhotoSticker } from "@/lib/canvas/diecut";
import { loadImage } from "@/lib/image/resize";
import { THEME_INFO, type Style, type Theme } from "@/lib/options";
import { renderLines } from "@/lib/render";
import type { Analysis, CaptionOption, Slots } from "@/lib/schemas";

type AnalyzeRes = { allowed: true; analysis: Analysis } | { allowed: false; blockReason: string };
type MatchRes = { picks: { template: CaptionOption["template"]; reason: string }[] };
type CaptionsRes = { options: CaptionOption[] };
type StylizeRes = { image?: string; fallback?: boolean };

type Phase = "setup" | "running" | "blocked" | "error" | "result";
type Result = { id: string; theme: Theme; options: CaptionOption[]; selected: number; notice: string | null };

const FALLBACK_NOTICE = "Couldn't stylise this one, so we used your photo.";

export function CreateClient() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [analysis, setAnalysis] = useState<{ photoId: number; analysis: Analysis } | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [consent, setConsent] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [stages, setStages] = useState<StageState>(freshStages);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [sheet, setSheet] = useState<SheetItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const stickerRef = useRef<HTMLCanvasElement | null>(null);
  const runRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);

  const ready = !!photo && !!theme && !!style && consent;
  const stepDone = !photo ? 0 : !(theme && style) ? 1 : phase === "result" ? 3 : 2;
  const clearToast = useCallback(() => setToast(null), []);

  async function generate() {
    if (!photo || !theme || !style || !consent || phase === "running") return;
    const runId = ++runRef.current;
    const live = () => runRef.current === runId;
    const tick = (id: StageId) => live() && setStages((s) => ({ ...s, [id]: "done" }));

    setPhase("running");
    setStages(freshStages());
    if (window.matchMedia("(max-width: 1023px)").matches) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      // [1] + [2] Safety gate and subject analysis (cached per photo, so "Try another vibe" skips it).
      let a = analysis?.photoId === photo.id ? analysis.analysis : null;
      if (!a) {
        const r = await postJson<AnalyzeRes>("/api/analyze", { image: photo.dataUrl }, 40_000);
        if (!live()) return;
        if (!r.allowed) {
          setMessage(r.blockReason);
          setPhase("blocked");
          return;
        }
        a = r.analysis;
        setAnalysis({ photoId: photo.id, analysis: a });
      }
      tick("check");
      tick("vibe");

      const fontsP = ensureFonts(theme);

      // [6] + [7] Stylize and die-cut, in parallel with [3]-[5].
      const drawP = (async () => {
        if (style !== "photo") {
          try {
            const s = await postJson<StylizeRes>("/api/stylize", { image: photo.dataUrl, style, analysis: a }, 58_000);
            if (s.image) {
              const img = await loadImage(s.image);
              const { canvas } = dieCutSticker(img);
              tick("draw");
              return { canvas, notice: null };
            }
          } catch (e) {
            if (e instanceof ApiError && e.status === 429) throw e;
          }
        }
        const img = await loadImage(photo.dataUrl);
        const canvas = roundedPhotoSticker(img);
        tick("draw");
        return { canvas, notice: style === "photo" ? null : FALLBACK_NOTICE };
      })();

      const capP = (async () => {
        const m = await postJson<MatchRes>("/api/match", { analysis: a, theme }, 30_000);
        tick("match");
        const c = await postJson<CaptionsRes>(
          "/api/captions",
          { analysis: a, theme, templateIds: m.picks.map((p) => p.template.id) },
          60_000,
        );
        tick("caption");
        return c.options.map((o) => ({ ...o, reason: m.picks.find((p) => p.template.id === o.template.id)?.reason ?? o.reason }));
      })();

      const [drawn, options] = await Promise.all([drawP, capP]);
      await fontsP;
      if (!live()) return;
      stickerRef.current = drawn.canvas;
      setResult({ id: crypto.randomUUID(), theme, options, selected: 0, notice: drawn.notice });
      setPhase("result");
    } catch (e) {
      if (!live()) return;
      setMessage(e instanceof ApiError ? e.message : "Something went wrong while making your sticker. Try again.");
      setPhase("error");
    }
  }

  // [8] Compose whenever the selected caption changes. The sheet entry for this sticker is kept in sync.
  useEffect(() => {
    if (!result || !stickerRef.current) return;
    let cancelled = false;
    const opt = result.options[result.selected];
    const canvas = document.createElement("canvas");
    composeSticker(canvas, stickerRef.current, renderLines(opt.template, opt.slots), result.theme);
    canvasToBlob(canvas).then((blob) => {
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      const label = Object.values(renderLines(opt.template, opt.slots)).join(" ");
      setSheet((prev) => {
        const old = prev.find((p) => p.id === result.id);
        // Keep the old URL alive briefly so the caption crossfade can finish.
        if (old) setTimeout(() => URL.revokeObjectURL(old.url), 1000);
        const item = { id: result.id, url, blob, label };
        return old ? prev.map((p) => (p.id === result.id ? item : p)) : [...prev, item];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const current = result ? sheet.find((s) => s.id === result.id) : undefined;

  const resetTo = (keepPhoto: boolean) => {
    runRef.current++;
    setPhase("setup");
    setResult(null);
    setConsent(keepPhoto ? consent : false);
    if (!keepPhoto) {
      setPhoto(null);
      setAnalysis(null);
    }
    requestAnimationFrame(() => (keepPhoto ? vibeRef : stageRef).current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const hint = !photo ? "Add a photo to start." : !theme ? "Pick a vibe." : !style ? "Pick a sticker style." : !consent ? "Tick the consent box." : "";
  const primaryButton = (
    <button
      type="button"
      onClick={generate}
      disabled={!ready || phase === "running"}
      aria-describedby={hint ? "make-hint" : undefined}
      className="w-full rounded-full bg-pop px-6 py-3.5 text-lg font-bold text-[#1C1A3A] disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
    >
      {phase === "running" ? "Making your sticker…" : "Make my sticker"}
    </button>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-36 lg:pb-16">
        <div className="lg:grid lg:grid-cols-[440px_1fr] lg:gap-10 flex flex-col-reverse gap-6">
          {/* Controls */}
          <div className="space-y-7">
            <StepIndicator done={stepDone} />

            {phase === "result" && result ? (
              <div className="space-y-6">
                <section aria-labelledby="pick-caption">
                  <h2 id="pick-caption" className="text-2xl font-extrabold mb-3">
                    Pick a caption
                  </h2>
                  <CaptionOptions
                    options={result.options}
                    selected={result.selected}
                    onSelect={(i) => setResult((r) => (r ? { ...r, selected: i } : r))}
                    onCommit={(i, slots: Slots) =>
                      setResult((r) => (r ? { ...r, options: r.options.map((o, j) => (j === i ? { ...o, slots } : o)) } : r))
                    }
                  />
                </section>
                {current && (
                  <ActionBar blob={current.blob} onToast={setToast} onAnotherVibe={() => resetTo(true)} onNewPhoto={() => resetTo(false)} />
                )}
              </div>
            ) : (
              <>
                <section aria-labelledby="s-photo" className="space-y-3">
                  <h2 id="s-photo" className="text-2xl font-extrabold">
                    1. Your photo
                  </h2>
                  <Uploader
                    photo={photo}
                    onPhoto={(p) => {
                      setPhoto(p);
                      setAnalysis(null);
                      if (phase !== "running") setPhase("setup");
                    }}
                  />
                </section>

                <section aria-labelledby="s-vibe" className="space-y-3 scroll-mt-6" ref={vibeRef}>
                  <h2 id="s-vibe" className="text-2xl font-extrabold">
                    2. Pick a vibe
                  </h2>
                  <VibePicker value={theme} onChange={setTheme} />
                  <h3 className="pt-2 text-lg font-extrabold">Sticker style</h3>
                  <StylePicker value={style} onChange={setStyle} />
                </section>

                <section aria-labelledby="s-make" className="space-y-3">
                  <h2 id="s-make" className="text-2xl font-extrabold">
                    3. Make it
                  </h2>
                  <ConsentBox checked={consent} onChange={setConsent} />
                  <div className="hidden lg:block">{primaryButton}</div>
                  {hint && (
                    <p id="make-hint" className="text-sm text-muted">
                      {hint}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>

          {/* Sticker preview stage */}
          <div ref={stageRef} className="scroll-mt-4 lg:sticky lg:top-6 self-start w-full">
            <div className="relative rounded-[28px] bg-surface/60 border border-line min-h-[340px] sm:min-h-[460px] lg:min-h-[560px] grid place-items-center p-6 overflow-hidden">
              <Stage phase={phase} photo={photo} stages={stages} message={message} url={current?.url} resultId={result?.id} onRetry={generate} onChoosePhoto={() => resetTo(false)} />
            </div>
            {phase === "result" && result?.notice && (
              <p role="status" className="mt-3 text-sm text-center text-muted">
                {result.notice}
              </p>
            )}
            {phase === "result" && result && (
              <p className="mt-2 text-sm text-center text-muted">
                {THEME_INFO[result.theme].emoji} {THEME_INFO[result.theme].label} · matched to “{result.options[result.selected].template.name}”
                {result.options[result.selected].reason ? `: ${result.options[result.selected].reason}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="mt-12">
          <StickerSheet items={sheet} onToast={setToast} />
        </div>
      </div>

      {/* Mobile: sticky primary action */}
      {phase !== "result" && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur px-4 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          {primaryButton}
        </div>
      )}
      <Toast message={toast} onDone={clearToast} />
    </MotionConfig>
  );
}

function Stage({
  phase,
  photo,
  stages,
  message,
  url,
  resultId,
  onRetry,
  onChoosePhoto,
}: {
  phase: Phase;
  photo: Photo | null;
  stages: StageState;
  message: string;
  url?: string;
  resultId?: string;
  onRetry: () => void;
  onChoosePhoto: () => void;
}) {
  if (phase === "result" && url && resultId) {
    return <StickerReveal url={url} revealKey={resultId} alt="Your finished sticker with its caption" />;
  }
  if (phase === "running" || (phase === "result" && !url)) {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="skeleton-sticker w-48 h-48 sm:w-60 sm:h-60 bg-surface shadow-sticker" style={{ borderRadius: "42% 48% 44% 50% / 48% 42% 52% 44%", rotate: "-3deg" }} />
        <ProgressSteps stages={stages} />
      </div>
    );
  }
  if (phase === "blocked") return <BlockedCard message={message} onChoose={onChoosePhoto} />;
  if (phase === "error") {
    return (
      <div role="alert" className="max-w-sm text-center">
        <span aria-hidden className="text-4xl">😵‍💫</span>
        <h2 className="mt-2 text-2xl font-extrabold">That didn&apos;t work</h2>
        <p className="mt-2 text-muted">{message}</p>
        <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-pop px-5 py-2.5 font-semibold text-[#1C1A3A]">
          Try again
        </button>
      </div>
    );
  }
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo.dataUrl} alt="Your photo, ready to become a sticker" className="sticker max-h-[420px] max-w-full w-auto object-contain" style={{ rotate: "-3deg" }} />
    );
  }
  return (
    <div className="dashed-cut w-56 h-56 sm:w-72 sm:h-72 grid place-items-center text-center p-8" style={{ rotate: "-3deg" }}>
      <p className="font-display text-xl font-extrabold text-muted">Your sticker shows up here</p>
    </div>
  );
}
