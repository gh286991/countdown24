import { Link } from 'react-router-dom';

const featureCards = [
  {
    title: 'CG 對話過場',
    description: '建立 24 天的照片 + 文案，打造身歷其境的劇情倒數。',
    accent: 'from-pink-500/30 to-cyan-400/20',
  },
  {
    title: 'QR 禮物庫',
    description: '結合 QR code 與圖片祝福，安排實體或數位兌換體驗。',
    accent: 'from-amber-400/30 to-emerald-400/20',
  },
];

function LandingPage() {
  return (
    <section className="max-w-6xl mx-auto py-16 px-6 lg:px-0">
      <div className="text-center space-y-6">
        <p className="uppercase tracking-[0.5em] text-aurora text-sm">COUNTDOWN 24</p>
        <h1 className="text-4xl lg:text-6xl font-display leading-tight">
          讓 24 天的倒數<br />變成專屬於你們的互動遊戲
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          使用 React + Express + Tailwind 建立可編輯的倒數任務、QR 禮物與接收者視角頁面。
          類似遊戲 CG 的場景呈現，搭配 Token 機制保障內容僅分享給指定對象。
        </p>
      </div>

      <div className="mt-12 grid md:grid-cols-2 gap-6">
        {featureCards.map((card) => (
          <div
            key={card.title}
            className={`glass-panel bg-gradient-to-br ${card.accent} border border-white/5`}
          >
            <h3 className="text-2xl font-semibold mb-3">{card.title}</h3>
            <p className="text-gray-200">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-4 justify-center">
        <Link
          to="/auth"
          className="px-8 py-3 rounded-full bg-aurora/80 text-midnight font-semibold hover:bg-aurora"
        >
          建立帳號
        </Link>
        <Link
          to="/receiver"
          className="px-8 py-3 rounded-full border border-white/30 hover:bg-white/10"
        >
          查看禮物收件匣
        </Link>
      </div>
    </section>
  );
}

export default LandingPage;

