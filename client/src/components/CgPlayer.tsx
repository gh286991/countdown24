import { useEffect, useMemo, useState } from 'react';
import { Branch, Game, Label, Menu, Say, Scene, prepareBranches, useBranchContext } from 'react-visual-novel';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import 'react-visual-novel/dist/index.css';
import { getPresignedUrls, isMinIOUrl, normalizeMinioUrl } from '../utils/imageUtils';

const COVER_LABEL = 'cover';
const ENDING_LABEL = 'ending';
const INITIAL_BRANCH_ID = 'Story';
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 400;
const INITIAL_SCENE_COUNT = 3;
interface CgPlayerProps {
  script: CgScript | null;
  className?: string;
  playerClassName?: string;
}

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
  hotspotMode?: 'auto' | 'manual';
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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function CgPlayer({ script, className, playerClassName }: CgPlayerProps) {
  const [presignedUrlsReady, setPresignedUrlsReady] = useState(true);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [presignedMap, setPresignedMap] = useState<Map<string, string>>(() => new Map());
  const scriptSignature = useMemo(() => (script ? JSON.stringify(script) : null), [script]);
  const resolvedScript = useMemo(() => (script ? rewriteCgAssets(script, presignedMap) : null), [script, presignedMap]);

  useEffect(() => {
    let active = true;
    const baseScript = script;
    setPresignedMap(new Map());
    if (!baseScript) {
      setPresignedUrlsReady(true);
      setImagesPreloaded(false);
      return () => {
        active = false;
      };
    }

    const urls = new Set<string>();
    collectCgAssetUrls(baseScript, urls);
    const targets = Array.from(urls).filter((url) => isMinIOUrl(url));
    if (!targets.length) {
      setPresignedUrlsReady(true);
      return () => {
        active = false;
      };
    }

    const scenes = Array.isArray(baseScript.scenes) ? baseScript.scenes.filter((scene) => scene?.id) : [];
    const startLabel =
      baseScript.startScene && scenes.some((scene) => scene.id === baseScript.startScene)
        ? baseScript.startScene
        : scenes[0]?.id;
    const orderedScenes: CgScene[] = [];
    if (startLabel) {
      const startIndex = scenes.findIndex((scene) => scene.id === startLabel);
      if (startIndex >= 0) {
        for (let i = startIndex; i < scenes.length; i += 1) {
          orderedScenes.push(scenes[i]);
        }
        for (let i = 0; i < startIndex; i += 1) {
          orderedScenes.push(scenes[i]);
        }
      } else {
        orderedScenes.push(...scenes);
      }
    } else {
      orderedScenes.push(...scenes);
    }

    const initialSceneIds = orderedScenes.slice(0, INITIAL_SCENE_COUNT);
    const coverBucket = new Set<string>();
    if (baseScript.cover) {
      collectCgAssetUrls(baseScript.cover, coverBucket);
    }
    const sceneBucket = new Set<string>();
    initialSceneIds.forEach((scene) => collectCgAssetUrls(scene, sceneBucket));
    const initialTargets = Array.from(new Set([...coverBucket, ...sceneBucket])).filter((url) => isMinIOUrl(url));
    const restTargets = targets.filter((url) => !initialTargets.includes(url));

    const updateMap = (map: Map<string, string>) => {
      setPresignedMap((prev) => {
        const next = new Map(prev);
        map.forEach((value, key) => next.set(key, value));
        return next;
      });
    };

    async function hydrate() {
      setPresignedUrlsReady(false);
      try {
        if (initialTargets.length) {
          const initialMap = await getPresignedUrls(initialTargets);
          if (!active) return;
          updateMap(initialMap);
        }
        setPresignedUrlsReady(true);
        const batches = chunkArray(restTargets, BATCH_SIZE);
        for (const batch of batches) {
          if (!active) return;
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
          try {
            const batchMap = await getPresignedUrls(batch);
            if (!active) return;
            updateMap(batchMap);
          } catch (innerError) {
            console.error('Failed to resolve CG asset batch', innerError);
            break;
          }
        }
      } catch (error) {
        console.error('Failed to resolve CG assets', error);
        if (active) {
          setPresignedUrlsReady(true);
        }
      }
    }

    hydrate();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptSignature]);

  // 手動預載所有圖片
  useEffect(() => {
    if (!resolvedScript || !presignedUrlsReady) {
      setImagesPreloaded(false);
      setPreloadProgress(0);
      return;
    }

    let active = true;
    const urls = new Set<string>();
    collectCgAssetUrls(resolvedScript, urls);
    const imageUrls = Array.from(urls);

    if (imageUrls.length === 0) {
      setImagesPreloaded(true);
      setPreloadProgress(100);
      return;
    }

    setImagesPreloaded(false);
    setPreloadProgress(0);

    let loadedCount = 0;
    const total = imageUrls.length;

    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (active) {
            loadedCount++;
            setPreloadProgress(loadedCount / total);
            resolve();
          }
        };
        img.onerror = () => {
          console.warn(`Failed to load image: ${url}`);
          if (active) {
            loadedCount++;
            setPreloadProgress(loadedCount / total);
            resolve(); // 即使失敗也繼續
          }
        };
        img.src = url;
      });
    };

    Promise.all(imageUrls.map(loadImage))
      .then(() => {
        if (active) {
          setImagesPreloaded(true);
          setPreloadProgress(100);
        }
      })
      .catch((error) => {
        console.error('Error preloading images:', error);
        if (active) {
          setImagesPreloaded(true); // 即使有錯誤也繼續
        }
      });

    return () => {
      active = false;
    };
  }, [resolvedScript, presignedUrlsReady]);

  const config = useMemo(() => buildGameConfig(resolvedScript), [resolvedScript]);

  if (!config) {
    return <p className="text-gray-400">尚未設定 CG JSON 或內容解析失敗。</p>;
  }

  if (!presignedUrlsReady || !resolvedScript) {
    return (
      <div className="flex h-[520px] w-full flex-col items-center justify-center text-sm text-gray-300">
        <p>準備 CG 圖片連結中...</p>
      </div>
    );
  }

  if (!imagesPreloaded) {
    return (
      <div className="flex h-[520px] w-full flex-col items-center justify-center text-sm text-gray-300">
        <p>載入 CG 圖片中...</p>
        <p className="text-xs text-gray-400">完成度 {Math.round(preloadProgress * 100)}%</p>
      </div>
    );
  }

  return (
    <div className={`${className || 'relative overflow-hidden rounded-3xl bg-slate-900/80'} cg-player-root`}>
      <QueryParamProvider adapter={ReactRouter6Adapter}>
        {/* @ts-expect-error - react-visual-novel types are too strict */}
        <Game assets={{}} branches={config.branches} initialBranchId={INITIAL_BRANCH_ID}>
          {(render) => {
            return <div className={playerClassName || 'h-[520px] w-full'}>{render()}</div>;
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
      bucket.add(isMinIOUrl(value) ? normalizeMinioUrl(value) : value);
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
    if (isMinIOUrl(value)) {
      const normalized = normalizeMinioUrl(value);
      return map.get(normalized) || map.get(value) || value;
    }
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

function SceneHotspotWrapper({
  scene,
  hotspots,
  fallbackNextId,
  labelColor,
  hasChoices,
}: {
  scene: CgScene;
  hotspots: CgHotspot[];
  fallbackNextId?: string;
  labelColor?: string;
  hasChoices?: boolean;
}) {
  const [armed, setArmed] = useState(scene.hotspotMode !== 'manual');
  const { focusedStatementIndex, getStatement } = useBranchContext();

  // 判斷當前 focused 的 statement 是否在這個場景中
  const focusedStatement = getStatement(focusedStatementIndex);
  const isInCurrentScene = focusedStatement?.label === scene.id;

  if (!hotspots.length || !isInCurrentScene) {
    return null;
  }
  return (
    <div
      className={`absolute inset-0 z-50 ${scene.hotspotMode === 'manual' && !armed ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={(e) => {
        // 攔截所有點擊，阻止背景跳轉
        if (scene.hotspotMode === 'manual' && !armed) {
          e.stopPropagation();
        }
      }}
    >
      {scene.hotspotMode === 'manual' && !armed ? (
        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <div className="rounded-2xl bg-slate-900/80 px-5 py-3 text-center shadow-2xl">
            <p className="text-sm text-gray-100">發現場景中的秘密物品，準備好後開始尋找。</p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-aurora px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-aurora/90"
              onClick={(e) => {
                e.stopPropagation();
                setArmed(true);
              }}
            >
              🔍 開始尋找
            </button>
          </div>
        </div>
      ) : (
        <HotspotLayer
          hotspots={hotspots}
          fallbackNextId={fallbackNextId}
          labelColor={labelColor}
          hasChoices={hasChoices}
        />
      )}
    </div>
  );
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
  const { goToStatement, focusedStatementIndex } = useBranchContext();
  const [activeSpot, setActiveSpot] = useState<CgHotspot | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(false);
  }, [focusedStatementIndex]);

  useEffect(() => {
    if (!activeSpot?.message) return undefined;
    const timer = setTimeout(() => setActiveSpot(null), 2400);
    return () => clearTimeout(timer);
  }, [activeSpot]);

  const handleClick = (spot: CgHotspot) => {
    if (isTransitioning) return;
    setActiveSpot(spot);
    if (spot.next) {
      setIsTransitioning(true);
      setTimeout(() => {
        goToStatement(spot.next as string);
      }, 350);
    } else if (!spot.message && fallbackNextId && !hasChoices) {
      setIsTransitioning(true);
      setTimeout(() => {
        goToStatement(fallbackNextId);
      }, 400);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0">
      {hotspots.map((spot) => {
        const active = activeSpot?.id === spot.id;
        return (
          <button
            key={spot.id}
            type="button"
            className={`group pointer-events-auto absolute rounded-2xl border-2 transition-all focus-visible:outline-none
            ${active ? 'opacity-100 shadow-xl' : 'opacity-0'}
            hover:opacity-100 focus-visible:opacity-100`}
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`,
              borderColor: spot.accent || labelColor || 'rgba(255,255,255,0.6)',
              backgroundImage: spot.image ? `url(${spot.image})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: active ? 'rgba(15,23,42,0.35)' : 'rgba(15,23,42,0.2)',
            }}
            onClick={(event) => {
              event.stopPropagation();
              handleClick(spot);
            }}
            aria-label={spot.label || 'hotspot'}
          >
            {spot.label ? (
              <span
                className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition
                ${active ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 group-focus-visible:opacity-100`}
                style={{
                  backgroundColor: 'rgba(15,23,42,0.8)',
                  color: 'white',
                }}
              >
                {spot.label}
              </span>
            ) : null}
          </button>
        );
      })}
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
      {renderCover(script.cover, startLabel, Boolean(script.ending)) as any}
      {scenes.map((scene, index) =>
        renderScene(scene, sceneMap, scenes[index + 1]?.id, Boolean(script.ending)),
      ) as any}
      {renderEnding(script.ending) as any}
    </Branch>
  );
  const branches = prepareBranches({ BranchStory });
  return { branches };
}

function renderCover(cover: CgScript['cover'], startLabel: string | null, hasEnding: boolean) {
  if (!cover && !startLabel) return null;
  const subtitle = cover?.subtitle || '24-DAY COUNTDOWN';
  const title = cover?.title || 'CG PLAYBACK';
  const description = cover?.description || '';
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
            next={
              !choices.length && !(scene.hotspots && scene.hotspots.length > 0) && idx === lines.length - 1
                ? nextLabel
                : undefined
            }
          >
            {line.text}
          </Say>
        );
      })}
      {scene.hotspots && scene.hotspots.length > 0 && (
        <SceneHotspotWrapper
          scene={scene}
          hotspots={scene.hotspots}
          labelColor={scene.accent}
          fallbackNextId={nextLabel}
          hasChoices={choices.length > 0}
        />
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
