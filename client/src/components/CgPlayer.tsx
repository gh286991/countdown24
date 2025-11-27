import { useEffect, useMemo, useState } from 'react';
import { Branch, Game, Label, Menu, Say, Scene, prepareBranches, useBranchContext } from 'react-visual-novel';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import 'react-visual-novel/dist/index.css';
import { getPresignedUrls, isMinIOUrl } from '../utils/imageUtils';

const COVER_LABEL = 'cover';
const ENDING_LABEL = 'ending';
const INITIAL_BRANCH_ID = 'Story';

interface CgDialogue {
  speaker?: string;
  text: string;
  expression?: string;
  expressionImage?: string;
}

interface CgHotspot {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  next?: string;
  message?: string;
  accent?: string;
  image?: string;
}

interface CgScene {
  id: string;
  label?: string;
  background?: string;
  characterPortrait?: string;
  dialogue?: Array<CgDialogue>;
  choices?: Array<{ label: string; next: string }>;
  next?: string;
  accent?: string;
  hotspots?: Array<CgHotspot>;
}

interface CgScript {
  cover?: {
    title?: string;
    subtitle?: string;
    description?: string;
    image?: string;
    background?: string;
    cta?: string;
  };
  startScene?: string;
  scenes?: Array<CgScene>;
  ending?: {
    title?: string;
    message?: string;
    image?: string;
    cta?: string;
  };
}

interface CgPlayerProps {
  script: CgScript | null;
}

function CgPlayer({ script }: CgPlayerProps) {
  const [resolvedScript, setResolvedScript] = useState<CgScript | null>(null);
  const [assetsReady, setAssetsReady] = useState(true);
  const scriptSignature = useMemo(() => (script ? JSON.stringify(script) : null), [script]);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const baseScript = script;
      if (!baseScript) {
        setResolvedScript(null);
        setAssetsReady(true);
        return;
      }
      const urls = new Set<string>();
      collectCgAssetUrls(baseScript, urls);
      const targets = Array.from(urls).filter((url) => isMinIOUrl(url));
      if (!targets.length) {
        setResolvedScript(baseScript);
        setAssetsReady(true);
        return;
      }
      setAssetsReady(false);
      setResolvedScript(null);
      try {
        const map = await getPresignedUrls(targets);
        if (!active) return;
        setResolvedScript(rewriteCgAssets(baseScript, map));
      } catch (error) {
        console.error('Failed to resolve CG assets', error);
        if (!active) return;
        setResolvedScript(baseScript);
      } finally {
        if (active) {
          setAssetsReady(true);
        }
      }
    }
    hydrate();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptSignature]);

  const config = useMemo(() => buildGameConfig(resolvedScript), [resolvedScript]);

  if (!config) {
    return <p className="text-gray-400">尚未設定 CG JSON 或內容解析失敗。</p>;
  }
  if (!assetsReady) {
    return (
      <div className="flex h-[520px] w-full flex-col items-center justify-center text-sm text-gray-300">
        <p>載入 CG 圖片中...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/80">
      <QueryParamProvider adapter={ReactRouter6Adapter}>
        <Game assets={{}} branches={config.branches} initialBranchId={INITIAL_BRANCH_ID}>
          {(render, preloadRes, progress) => {
            if (preloadRes.status === 'loading') {
              return (
                <div className="flex h-[520px] w-full flex-col items-center justify-center text-sm text-gray-300">
                  <p>載入 CG 場景...</p>
                  <p className="text-xs text-gray-400">完成度 {Math.round(progress * 100)}%</p>
                </div>
              );
            }

            if (preloadRes.status === 'failure') {
              return (
                <div className="flex h-[520px] w-full items-center justify-center text-sm text-red-300">
                  無法載入圖片資源，請檢查 JSON 內的圖片連結。
                </div>
              );
            }

            return <div className="h-[520px] w-full">{render()}</div>;
          }}
        </Game>
      </QueryParamProvider>
    </div>
  );
}

function isLikelyUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
}

function collectCgAssetUrls(value: any, bucket: Set<string>) {
  if (!value) return;
  if (typeof value === 'string') {
    if (isLikelyUrl(value)) {
      bucket.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectCgAssetUrls(item, bucket));
    return;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((val) => collectCgAssetUrls(val, bucket));
  }
}

function rewriteCgAssets(value: any, map: Map<string, string>): any {
  if (!value) return value;
  if (typeof value === 'string') {
    return map.get(value) || value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteCgAssets(item, map));
  }
  if (typeof value === 'object') {
    const next: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      next[key] = rewriteCgAssets(val, map);
    });
    return next;
  }
  return value;
}

function HotspotLayer({
  hotspots,
  fallbackNextId,
  labelColor,
  hasChoices,
}: {
  hotspots: CgHotspot[];
  fallbackNextId?: string;
  labelColor?: string;
  hasChoices?: boolean;
}) {
  const { goToStatement } = useBranchContext();
  const [activeSpot, setActiveSpot] = useState<CgHotspot | null>(null);
  useEffect(() => {
    if (!activeSpot?.message) return undefined;
    const timer = setTimeout(() => setActiveSpot(null), 2400);
    return () => clearTimeout(timer);
  }, [activeSpot]);

  const handleClick = (spot: CgHotspot) => {
    setActiveSpot(spot);
    if (spot.next) {
      setTimeout(() => {
        goToStatement(spot.next as string);
      }, 350);
    } else if (!spot.message && fallbackNextId && !hasChoices) {
      setTimeout(() => {
        goToStatement(fallbackNextId);
      }, 400);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {hotspots.map((spot) => (
        <button
          key={spot.id}
          type="button"
          className="pointer-events-auto absolute rounded-2xl border-2 border-white/60 bg-white/5 transition hover:bg-white/20"
          style={{
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            width: `${spot.width}%`,
            height: `${spot.height}%`,
            borderColor: spot.accent || labelColor || 'rgba(255,255,255,0.6)',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.45)',
            backgroundImage: spot.image ? `url(${spot.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleClick(spot);
          }}
        >
          {spot.label ? (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
              {spot.label}
            </span>
          ) : null}
        </button>
      ))}
      {activeSpot?.message && (
        <div className="pointer-events-auto absolute inset-x-0 bottom-6 flex justify-center">
          <div className="max-w-md rounded-2xl bg-slate-900/90 px-5 py-3 text-center text-sm text-white shadow-lg">
            <p className="font-semibold" style={{ color: activeSpot.accent || labelColor || '#f97316' }}>
              {activeSpot.label || '提示'}
            </p>
            <p className="text-xs text-gray-200 mt-1">{activeSpot.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function buildGameConfig(script: CgScript | null) {
  if (!script) return null;
  const scenes = Array.isArray(script.scenes) ? script.scenes.filter((scene) => scene?.id) : [];
  const sceneMap = new Map(scenes.map((scene) => [scene.id, scene]));
  const startLabel = script.startScene && sceneMap.has(script.startScene) ? script.startScene : scenes[0]?.id || ENDING_LABEL;

  const BranchStory = () => (
    <Branch>
      {renderCover(script.cover, startLabel, Boolean(script.ending))}
      {scenes.map((scene, index) =>
        renderScene(scene, sceneMap, scenes[index + 1]?.id, Boolean(script.ending)),
      )}
      {renderEnding(script.ending)}
    </Branch>
  );

  const branches = prepareBranches({ BranchStory });
  return { branches };
}

function renderCover(cover: CgScript['cover'], startLabel: string | null, hasEnding: boolean) {
  if (!cover && !startLabel) return null;
  const subtitle = cover?.subtitle || '24-DAY COUNTDOWN';
  const title = cover?.title || 'CG PLAYBACK';
  const description = cover?.description || '點擊開始播放這段 CG 劇情。';
  const cta = cover?.cta || '開始播放';
  const targetLabel = startLabel || (hasEnding ? ENDING_LABEL : null);

  return (
    <Label label={COVER_LABEL} key={COVER_LABEL}>
      {(cover?.image || cover?.background) && <Scene src={cover.image || cover.background || ''} durationMs={800} />}
      <Say
        placement="middle"
        scheme="dark"
        scrim
        tag={{ text: subtitle, style: { letterSpacing: '0.4em' } }}
      >
        {title}
      </Say>
      {description ? (
        <Say placement="middle" scheme="dark" scrim>
          {description}
        </Say>
      ) : null}
      {targetLabel ? (
        <Menu
          placement="bottom"
          size="lg"
          scheme="dark"
          choices={[
            {
              label: cta,
              onClick: (ctx: any) => ctx.goToStatement(targetLabel),
            },
          ]}
        />
      ) : null}
    </Label>
  );
}

function renderScene(
  scene: CgScene,
  sceneMap: Map<string, CgScene>,
  fallbackNextId: string | undefined,
  hasEnding: boolean,
) {
  const nextLabel = resolveNextLabel(scene, sceneMap, fallbackNextId, hasEnding);
  const lines = Array.isArray(scene.dialogue) ? scene.dialogue : [];
  const choices = Array.isArray(scene.choices) ? scene.choices : [];
  const defaultPortrait = scene.characterPortrait || undefined;
  const characterImageStyle = {
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    height: '95%',
    maxWidth: '70%',
    objectFit: 'contain' as const,
    pointerEvents: 'none' as const,
    filter: 'drop-shadow(0 30px 40px rgba(15, 23, 42, 0.65))',
  };

  return (
    <Label label={scene.id} key={scene.id}>
      {scene.background && <Scene src={scene.background} durationMs={800} />}
      {lines.map((line, idx) => {
        const portrait = line.expressionImage || defaultPortrait;
        const tagText = line.speaker
          ? `${line.speaker}${line.expression ? ` · ${line.expression}` : ''}`
          : line.expression || '';
        const tag =
          tagText.length > 0
            ? {
                text: tagText,
                style: {
                  letterSpacing: '0.2em',
                  ...(scene.accent ? { color: scene.accent } : {}),
                },
              }
            : undefined;

        return (
          <Say
            key={`${scene.id}-line-${idx}`}
            placement="bottom"
            scheme="dark"
            scrim
            image={
              portrait
                ? {
                    uri: portrait,
                    style: characterImageStyle,
                  }
                : undefined
            }
            tag={tag}
            next={!choices.length && idx === lines.length - 1 ? nextLabel : undefined}
          >
            {line.text}
          </Say>
        );
      })}
      {scene.hotspots && scene.hotspots.length > 0 && (
        <HotspotLayer hotspots={scene.hotspots} labelColor={scene.accent} fallbackNextId={nextLabel} hasChoices={choices.length > 0} />
      )}
      {choices.length > 0 && (
        <Menu
          key={`${scene.id}-menu`}
          placement="bottom"
          size="lg"
          scheme="dark"
          choices={choices.map((choice, idx) => ({
            label: choice.label || `選項 ${idx + 1}`,
            onClick: (ctx: any) => {
              const target = resolveChoiceTarget(choice.next, sceneMap, nextLabel, hasEnding);
              if (target) {
                ctx.goToStatement(target);
              }
            },
          }))}
        />
      )}
      {!lines.length && !choices.length && nextLabel && (
        <Menu
          placement="bottom"
          size="md"
          scheme="dark"
          choices={[
            {
              label: '繼續',
              onClick: (ctx: any) => ctx.goToStatement(nextLabel),
            },
          ]}
        />
      )}
    </Label>
  );
}

function renderEnding(ending: CgScript['ending']) {
  if (!ending) return null;
  return (
    <Label label={ENDING_LABEL} key={ENDING_LABEL}>
      {ending.image && <Scene src={ending.image} durationMs={800} />}
      <Say
        placement="bottom"
        scheme="dark"
        scrim
        tag={{ text: ending.title || 'DAY CLEAR', style: { letterSpacing: '0.3em' } }}
      >
        {ending.message || '完成今日劇情，明天見。'}
      </Say>
      <Menu
        placement="bottom"
        size="md"
        scheme="dark"
        choices={[
          {
            label: ending.cta || '回到封面',
            onClick: (ctx: any) => ctx.goToStatement(COVER_LABEL),
          },
        ]}
      />
    </Label>
  );
}

function resolveNextLabel(
  scene: CgScene,
  sceneMap: Map<string, CgScene>,
  fallbackNextId: string | undefined,
  hasEnding: boolean,
): string {
  if (scene?.next && (sceneMap.has(scene.next) || scene.next === COVER_LABEL || scene.next === ENDING_LABEL)) {
    return scene.next;
  }
  if (fallbackNextId && sceneMap.has(fallbackNextId)) {
    return fallbackNextId;
  }
  if (hasEnding) return ENDING_LABEL;
  return COVER_LABEL;
}

function resolveChoiceTarget(
  next: string | undefined,
  sceneMap: Map<string, CgScene>,
  defaultLabel: string | undefined,
  hasEnding: boolean,
): string | undefined {
  if (next && (sceneMap.has(next) || next === COVER_LABEL || next === ENDING_LABEL)) {
    return next;
  }
  if (defaultLabel) {
    return defaultLabel;
  }
  return hasEnding ? ENDING_LABEL : COVER_LABEL;
}

export default CgPlayer;
