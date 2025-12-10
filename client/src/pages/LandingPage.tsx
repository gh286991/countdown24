import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  LuArrowUpRight,
  LuCalendarClock,
  LuChartPie,
  LuGift,
  LuLayers,
  LuScrollText,
  LuShieldCheck,
  LuSparkles,
  LuUsers,
} from 'react-icons/lu';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const { ref, isVisible } = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}

function LandingPage() {
  const heroStats = [
    { value: '120+', label: '完成倒數專案' },
    { value: '3x', label: '互動回訪提升' },
    { value: '24 天', label: '專屬儀式感' },
  ];

  const focusCards = [
    {
      title: '互動劇情',
      description: '15 分鐘排程 24 天故事線，保持品牌溫度。',
      icon: LuSparkles,
      colors: 'from-[#4f46e5]/70 to-[#ec4899]/70',
    },
    {
      title: '雙模整合',
      description: 'CG 過場搭配禮品驚喜庫，線上線下一次到位。',
      icon: LuLayers,
      colors: 'from-[#0ea5e9]/70 to-[#14b8a6]/70',
    },
    {
      title: '洞察追蹤',
      description: '即時掌握解鎖率與互動數據，調整節奏。',
      icon: LuChartPie,
      colors: 'from-[#f97316]/70 to-[#ef4444]/70',
    },
  ];

  const featureTiles = [
    {
      title: '每日解鎖',
      description: '用時間軸控管節奏，讓受眾每天期待新亮點。',
      icon: LuCalendarClock,
    },
    {
      title: '多媒體素材',
      description: '影像、語音、文件一次匯入並套用模板。',
      icon: LuScrollText,
    },
    {
      title: '禮品體驗',
      description: '掃描禮品小卡或輸入代碼即可同步解鎖驚喜內容。',
      icon: LuGift,
    },
    {
      title: '安全控制',
      description: '一次性禮品卡序號、訪問限制與提醒機制全面控管。',
      icon: LuShieldCheck,
    },
  ];

  const caseStudies = [
    {
      title: '聖誕節品牌倒數',
      description: '24 天逐步釋出節慶合作與限量贈品。',
      tag: 'Seasonal Campaign',
      image: '/landing/case-holiday.svg',
    },
    {
      title: 'VIP 生日旅程',
      description: '以個人化影音與禮品驚喜延長生日感動。',
      tag: 'VIP Care',
      image: '/landing/case-birthday.svg',
    },
    {
      title: '新品上市預熱',
      description: '倒數期間逐步揭露功能亮點，串聯開箱活動。',
      tag: 'Product Launch',
      image: '/landing/case-launch.svg',
    },
  ];

  const galleryShots = [
    {
      title: 'Creator Console',
      description: '整合內容、媒體與提醒設定的可視化介面。',
      image: '/landing/gallery-console.svg',
    },
    {
      title: 'VIP Experience',
      description: '倒數旅程延伸到線下派對與工作坊。',
      image: '/landing/gallery-journey.svg',
    },
    {
      title: 'Gift Journey',
      description: '禮品卡搭配禮物盒，掃描即可同步解鎖內容。',
      image: '/landing/gallery-gift.svg',
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <picture>
            <source media="(max-width: 640px)" srcSet="/landing/hero-dashboard-mobile.svg" />
            <img
              src="/landing/hero-dashboard-desktop.svg"
              alt="Countdown24 Creator Console 示意圖"
              className="w-full h-full object-cover opacity-50"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-br from-[#01030a] via-[#020617]/95 to-[#0a1730]" />
        </div>
        <div className="absolute -top-10 right-12 w-64 h-64 bg-[#1d4ed8]/40 blur-3xl rounded-full animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute -bottom-16 left-0 w-72 h-72 bg-[#ec4899]/30 blur-3xl rounded-full animate-[pulse_14s_ease-in-out_infinite]" />

        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] relative z-10">
          <Reveal className="space-y-8">
            <p className="uppercase tracking-[0.3em] text-xs text-white/70">Commercial Countdown Studio</p>
            <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
              Countdown24 Experience
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#60a5fa] via-[#a78bfa] to-[#fb7185]">
                讓倒數成為行銷色塊
              </span>
            </h1>
            <p className="text-lg text-slate-200 max-w-2xl">
              簡短文案、媒體素材與禮品任務全部拖拉完成，配合滑動出現的動畫節奏，營造更有層次的品牌印象。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/auth"
                className="group relative overflow-hidden px-8 py-3 rounded-full bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#ec4899] text-xs font-semibold uppercase tracking-[0.4em]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  立即體驗
                  <LuArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/20" />
              </Link>
              <a
                href="#color-blocks"
                className="px-8 py-3 rounded-full border border-white/30 text-xs font-semibold uppercase tracking-[0.4em] text-white/80 hover:text-white"
              >
                看流程
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat, index) => (
                <Reveal key={stat.label} delay={index * 80} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-sm text-slate-300">{stat.label}</p>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200} className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/20 to-white/0 blur-3xl opacity-40" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-[#03050b]/80">
              <picture>
                <source media="(max-width: 640px)" srcSet="/landing/hero-dashboard-mobile.svg" />
                <img
                  src="/landing/hero-live-scene.svg"
                  alt="倒數體驗示意螢幕"
                  className="w-full h-full object-cover"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
                    <LuSparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.4em] text-white/70">Live Scene</p>
                    <p className="text-xl font-semibold">Day 07 · Story Drop</p>
                  </div>
                </div>
                <p className="text-sm text-white/90">
                  右側改成示意畫面，直接展示整體視覺而非資料卡片，方便快速理解。
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="color-blocks" className="bg-[#040c1c] py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Color Block Workflow</p>
            <h2 className="mt-4 text-3xl font-semibold">用色塊分區，讓資訊一目了然</h2>
            <p className="mt-3 text-slate-300">
              三段式內容區塊對應不同目標：先暖場、再互動、最後轉換。配合滑動即現的動畫節奏，閱讀節奏更俐落。
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {focusCards.map(({ title, description, icon: Icon, colors }, index) => (
              <Reveal
                key={title}
                delay={index * 100}
                className={`rounded-3xl border border-white/10 bg-gradient-to-br ${colors} p-6 shadow-lg shadow-black/40`}
              >
                <Icon className="w-7 h-7 text-white mb-4" />
                <p className="text-xl font-semibold">{title}</p>
                <p className="text-sm text-white/90 mt-2">{description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#060f1f] py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {featureTiles.map(({ title, description, icon: Icon }, index) => (
              <Reveal
                key={title}
                delay={index * 60}
                className="flex items-center gap-4 rounded-3xl border border-white/10 bg-[#0b1224] p-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="space-y-6">
            <Reveal className="rounded-3xl bg-gradient-to-br from-[#101b33] to-[#0b1224] p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <LuGift className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-white/70">禮品驚喜庫</p>
                    <p className="text-lg font-semibold">實體＋數位同時上線</p>
                  </div>
                </div>
              <p className="text-slate-300 text-sm">
                系統自帶多款列印範本，可先放上我們挑選的圖庫素材，再慢慢換成正式視覺。
              </p>
            </Reveal>
            <Reveal delay={120} className="rounded-3xl bg-gradient-to-br from-[#121f34] to-[#0a1424] p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                  <LuUsers className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-white/70">對象管理</p>
                  <p className="text-lg font-semibold">指定接收者快速指派</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                透過指派與提醒工具，讓 VIP 或客戶在倒數期間維持每日接觸。
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-[#050b17] py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Experience Gallery</p>
            <h2 className="mt-4 text-3xl font-semibold">產品情境示意圖庫</h2>
            <p className="mt-3 text-slate-300">直接提供 Creator Console、接收端旅程與禮品流程的示意插圖，行動與桌面皆具備固定比例裁切。</p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {galleryShots.map(({ title, description, image }, index) => (
              <Reveal
                key={title}
                delay={index * 80}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <img src={image} alt={title} className="w-full object-cover opacity-90 aspect-[4/3]" />
                <div className="p-5 space-y-1">
                  <p className="text-lg font-semibold">{title}</p>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#060c1d] py-20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-10">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">Use Cases</p>
            <h2 className="mt-4 text-3xl font-semibold">三種最常見的倒數任務</h2>
          </Reveal>
          <div className="grid gap-8 lg:grid-cols-3">
            {caseStudies.map(({ title, description, tag, image }, index) => (
              <Reveal
                key={title}
                delay={index * 120}
                className="rounded-3xl overflow-hidden border border-white/10 bg-[#0b1224]"
              >
                <div className="relative aspect-[4/3]">
                  <img src={image} alt={title} className="w-full h-full object-cover" />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#050b17]">
                    {tag}
                  </span>
                </div>
                <div className="p-6 space-y-2">
                  <p className="text-xl font-semibold">{title}</p>
                  <p className="text-sm text-slate-300">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#020617] py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Reveal className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-r from-[#111a2a] to-[#1f0f2e] px-8 py-12">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.5),_transparent_50%)] animate-[pulse_14s_ease-in-out_infinite]" />
            <div className="relative z-10 grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Ready When You Are</p>
                <h3 className="mt-4 text-3xl font-semibold leading-tight">現在就用色塊排出第一版首頁</h3>
                <p className="mt-4 text-slate-200">直接帶走這份模板、動畫與圖庫，最快今天就能讓倒數頁面上線。</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/auth"
                  className="flex-1 min-w-[200px] text-center rounded-full bg-white text-[#111a2a] px-6 py-3 font-semibold uppercase tracking-[0.3em]"
                >
                  開始創作
                </Link>
                <Link
                  to="/receiver"
                  className="flex-1 min-w-[200px] text-center rounded-full border border-white/50 px-6 py-3 font-semibold uppercase tracking-[0.3em] text-white/80 hover:text-white"
                >
                  觀看接收端
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
