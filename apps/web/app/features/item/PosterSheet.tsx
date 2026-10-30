// Share poster: the server-rendered poster (with a QR code to the article), to save or hand to the
// system share sheet. Loaded on demand from the article page; a bottom sheet on phones, centred above.
// The QR code can be switched off: some feeds reject images that carry one.
import { useEffect, useState } from "react";
import { SITE } from "@aihot/site";
import { Sheet } from "../../components/ui/Sheet";
import { ToggleChip } from "../../components/ui/Controls";
import { IconDownload, IconShare } from "../../components/icons";

export default function PosterSheet({ id, title, open, onClose }: { id: string; title: string; open: boolean; onClose: () => void }) {
  const [withQr, setWithQr] = useState(true);
  const src = `/og/posters/${id}.png${withQr ? "" : "?qr=0"}`;
  const suffix = withQr ? "" : "-noqr";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      setCanShareFile(!!navigator.canShare?.({ files: [new File([], "p.png", { type: "image/png" })] }));
    } catch {
      setCanShareFile(false);
    }
  }, [open]);

  function toggleQr() {
    setWithQr((v) => !v);
    setLoaded(false);
    setFailed(false);
  }

  async function share() {
    try {
      const blob = await (await fetch(src)).blob();
      await navigator.share({ files: [new File([blob], `${SITE.mcpPrefix}-${id}${suffix}.png`, { type: "image/png" })], title });
    } catch {
      // cancelled or unsupported: saving stays available
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="分享海报" centered>
      <div className="flex flex-col items-center px-5 sm:px-7">
        <div className="relative aspect-[3/4] w-full max-w-[min(360px,calc((88dvh-240px)*0.75))] overflow-hidden rounded-card border border-line bg-bg-sunk">
          {!loaded && !failed && <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] bg-[length:200%_100%]" />}
          {failed ? (
            <p className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] text-ink-3">海报生成失败，请稍后再试。</p>
          ) : (
            <img
              key={src}
              src={src}
              alt={`${title} · 分享海报`}
              className={`size-full object-contain transition-[opacity,transform] duration-[250ms] ${loaded ? "scale-100 opacity-100" : "scale-[0.985] opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>
        <p className="mt-3 text-[12.5px] text-ink-3">长按图片可保存或发送给朋友</p>
        <div className="mt-2.5">
          <ToggleChip on={withQr} onToggle={toggleQr}>{withQr ? "带二维码" : "不带二维码 · 部分社媒友好"}</ToggleChip>
        </div>
        <div className="mt-3 flex w-full max-w-[360px] gap-2">
          <a
            href={src}
            download={`${SITE.mcpPrefix}-${id}${suffix}.png`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-accent text-[14px] font-medium text-accent-contrast transition-colors hover:bg-accent-ink lg:h-10 sm:text-[13.5px]"
          >
            <IconDownload size={15} /> 保存图片
          </a>
          {canShareFile && (
            <button type="button" onClick={share} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-line-strong bg-surface text-[14px] font-medium text-ink transition-colors hover:border-ink-4 lg:h-10 sm:text-[13.5px]">
              <IconShare size={15} /> 分享
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
