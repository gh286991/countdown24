import { Link } from 'react-router-dom';
import { HiOutlineCamera, HiOutlineGift } from 'react-icons/hi2';

const featureCards = [
  {
    icon: HiOutlineCamera,
    title: 'CG 對話過場',
    description: '建立 24 天的照片 + 文案，打造身歷其境的劇情倒數。',
    accent: 'from-christmas-green/15 to-christmas-red/8',
    glowColor: 'rgba(107, 155, 122, 0.2)',
  },
  {
    icon: HiOutlineGift,
    title: 'QR 禮物庫',
    description: '結合 QR code 與圖片祝福，安排實體或數位兌換體驗。',
    accent: 'from-christmas-red/15 to-christmas-gold/8',
    glowColor: 'rgba(200, 90, 90, 0.2)',
  },
];

function LandingPage() {
  return (
    <section className="max-w-6xl mx-auto py-20 px-6 relative z-10">
      {/* Hero Section */}
      <div className="text-center space-y-8 mb-20">
        <div className="inline-block animate-float">
          <p className="uppercase tracking-[0.5em] text-white text-xs font-bold mb-4 flex items-center justify-center gap-2">
            <HiOutlineGift className="w-4 h-4" />
            倒數禮物盒
            <HiOutlineGift className="w-4 h-4" />
          </p>
          <div className="glow-icon relative inline-block mb-6">
            <HiOutlineGift className="w-20 h-20 animate-twinkle text-white" />
          </div>
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-display leading-tight text-white">
          讓 24 天的倒數
          <br />
          <span className="text-white">變成專屬於你們的互動遊戲</span>
        </h1>
        
        <p className="text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          使用 React + Express + Tailwind 建立可編輯的倒數任務、QR 禮物與接收者視角頁面
          <br />
          <span className="text-sm text-gray-400 mt-2 block">
            類似遊戲 CG 的場景呈現，搭配 Token 機制保障內容僅分享給指定對象
          </span>
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {featureCards.map((card, index) => (
          <div
            key={card.title}
            className={`group glass-panel bg-gradient-to-br ${card.accent} hover:scale-105 transition-all duration-300 cursor-pointer`}
            style={{
              animationDelay: `${index * 200}ms`,
            }}
          >
            <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
              <card.icon className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-3 text-white">{card.title}</h3>
            <p className="text-gray-200 leading-relaxed">{card.description}</p>
            <div 
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                boxShadow: `0 0 40px ${card.glowColor}`,
              }}
            />
          </div>
        ))}
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link
          to="/auth"
          className="group relative px-10 py-4 rounded-2xl bg-gradient-to-r from-christmas-red to-christmas-red-dark text-white font-bold text-lg shadow-glow-red hover:shadow-glow-lg transition-all duration-300 hover:scale-105 overflow-hidden"
        >
          <span className="relative z-10 flex items-center gap-2">
            <HiOutlineGift className="w-5 h-5" />
            立即建立帳號
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-christmas-red-light to-christmas-red opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
        
        <Link
          to="/receiver"
          className="px-10 py-4 rounded-2xl glass-panel text-white font-semibold text-lg hover:border-christmas-green/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 justify-center"
        >
          <HiOutlineGift className="w-5 h-5" />
          查看禮物收件匣
        </Link>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-christmas-red/12 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-christmas-green/12 rounded-full blur-3xl animate-pulse-slow animation-delay-400" />
      <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-christmas-gold/10 rounded-full blur-3xl animate-pulse-slow animation-delay-600" />
    </section>
  );
}

export default LandingPage;

