import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  ArrowLeft, ArrowRight, Sparkles, TrendingUp, PieChart as PieIcon,
  Zap, Brain, Rocket, Palmtree, BarChart3, Globe, Coins, Activity,
  ChevronDown, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────
interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  value: number | null;
  emoji: string;
  color: string;
  breakdown?: any[];
  simulation?: any;
}

interface FinancialPlan {
  generatedAt: string;
  summary: any;
  portfolioMetrics: any;
  allocation: any[];
  simulation: any;
  goalAnalysis: any[];
  kelly: any;
  retirement: any;
  storyChapters: StoryChapter[];
}

interface MarketData {
  forex?: any;
  crypto?: any;
  indices?: any;
  mutualFunds?: any;
}

// ── Animated Counter Component ────────────────────────────────────
const AnimatedCounter: React.FC<{ target: number; duration?: number; prefix?: string; suffix?: string }> = ({
  target, duration = 2000, prefix = '₹', suffix = ''
}) => {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (target <= 0) { setCurrent(0); return; }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.round(target * eased));
      if (progress < 1) rafId.current = requestAnimationFrame(animate);
    };

    startTime.current = null;
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return (
    <span className="animated-counter">
      {prefix}{current.toLocaleString('en-IN')}{suffix}
    </span>
  );
};

// ── Allocation Donut ──────────────────────────────────────────────
const ALLOC_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const AllocationDonut: React.FC<{ breakdown: any[] }> = ({ breakdown }) => {
  const data = breakdown.map(b => ({ name: b.name, value: b.weight }));
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            animationBegin={200}
            animationDuration={1200}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <RechartsTooltip
            contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
            formatter={(value: any) => `${value}%`}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Monte Carlo Fan Chart ─────────────────────────────────────────
const MonteCarloChart: React.FC<{ yearlyData: any[] }> = ({ yearlyData }) => {
  if (!yearlyData || yearlyData.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={yearlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mc-p90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mc-p50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="mc-p10" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis dataKey="year" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
          <YAxis
            stroke="var(--text-muted)"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
          />
          <RechartsTooltip
            contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }}
            formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
          />
          <Area type="monotone" dataKey="p90" stroke="#10b981" fill="url(#mc-p90)" name="Optimistic (P90)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="p50" stroke="#8b5cf6" fill="url(#mc-p50)" name="Median (P50)" strokeWidth={2.5} />
          <Area type="monotone" dataKey="p10" stroke="#ef4444" fill="url(#mc-p10)" name="Pessimistic (P10)" strokeWidth={1.5} />
          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


// ── Market Ticker Strip ───────────────────────────────────────────
const MarketTicker: React.FC<{ markets: MarketData }> = ({ markets }) => {
  const items: { label: string; value: string; change?: number }[] = [];

  if (markets.indices?.sensex) {
    items.push({
      label: 'SENSEX',
      value: markets.indices.sensex.price?.toLocaleString('en-IN') || '—',
      change: markets.indices.sensex.changePercent,
    });
  }
  if (markets.indices?.nifty) {
    items.push({
      label: 'NIFTY 50',
      value: markets.indices.nifty.price?.toLocaleString('en-IN') || '—',
      change: markets.indices.nifty.changePercent,
    });
  }
  if (markets.forex?.rates?.USD) {
    items.push({ label: 'USD/INR', value: `₹${markets.forex.rates.USD}` });
  }
  if (markets.crypto?.topCoins?.[0]) {
    const btc = markets.crypto.topCoins[0];
    items.push({
      label: btc.symbol,
      value: `₹${btc.currentPrice?.toLocaleString('en-IN')}`,
      change: btc.priceChangePercent24h,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="market-ticker-strip">
      {items.map((item, i) => (
        <div key={i} className="ticker-item">
          <span className="ticker-label">{item.label}</span>
          <span className="ticker-value">{item.value}</span>
          {item.change !== undefined && (
            <span className={`ticker-change ${item.change >= 0 ? 'positive' : 'negative'}`}>
              {item.change >= 0 ? '+' : ''}{item.change}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
};


// ── Main MoneyStory Component ─────────────────────────────────────
const MoneyStory: React.FC = () => {
  const [plan, setPlan] = useState<FinancialPlan | null>(null);
  const [markets, setMarkets] = useState<MarketData>({});
  const [currentChapter, setCurrentChapter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [marketTab, setMarketTab] = useState<'forex' | 'crypto' | 'mf' | 'indices'>('indices');
  const [showMarkets, setShowMarkets] = useState(false);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const marketsRef = useRef<HTMLDivElement | null>(null);

  // Generate plan on mount
  useEffect(() => {
    loadPlan();
    loadMarkets();
  }, []);

  const loadPlan = async () => {
    setIsGenerating(true);
    try {
      const res = await api.quant.generatePlan(10);
      if (res.status === 'success') {
        setPlan(res.plan);
      }
    } catch (err) {
      console.error('Failed to generate plan:', err);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const loadMarkets = async () => {
    try {
      const [forex, crypto, indices, mf] = await Promise.allSettled([
        api.markets.forex(),
        api.markets.crypto(),
        api.markets.indices(),
        api.markets.mutualFunds(),
      ]);
      setMarkets({
        forex: forex.status === 'fulfilled' ? forex.value.data : null,
        crypto: crypto.status === 'fulfilled' ? crypto.value.data : null,
        indices: indices.status === 'fulfilled' ? indices.value.data : null,
        mutualFunds: mf.status === 'fulfilled' ? mf.value.data : null,
      });
    } catch (err) {
      console.error('Failed to load markets:', err);
    }
  };

  const chapters = plan?.storyChapters || [];
  const canGoNext = currentChapter < chapters.length - 1;
  const canGoPrev = currentChapter > 0;

  const nextChapter = () => { if (canGoNext) setCurrentChapter(c => c + 1); };
  const prevChapter = () => { if (canGoPrev) setCurrentChapter(c => c - 1); };

  const scrollToMarkets = () => {
    setShowMarkets(true);
    setTimeout(() => {
      marketsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // ── Loading State ──────────────────────────────────────────────
  if (isLoading || isGenerating) {
    return (
      <div className="story-loading">
        <div className="story-loading-spinner" />
        <h2 className="text-gradient">Crafting Your Financial Story...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Running 1,000 Monte Carlo simulations</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="story-loading">
        <h2>Unable to generate plan</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please complete onboarding first.</p>
      </div>
    );
  }

  const chapter = chapters[currentChapter];

  // ── Chapter Icons ──────────────────────────────────────────────
  const chapterIcons: Record<string, React.ReactNode> = {
    earning: <Zap size={32} />,
    spending: <PieIcon size={32} />,
    surplus: <Sparkles size={32} />,
    allocation: <Brain size={32} />,
    projection: <Rocket size={32} />,
    retirement: <Palmtree size={32} />,
  };

  return (
    <div className="story-container">
      {/* Market Ticker */}
      <MarketTicker markets={markets} />

      {/* Story Progress */}
      <div className="story-progress">
        {chapters.map((ch, i) => (
          <button
            key={ch.id}
            className={`story-dot ${i === currentChapter ? 'active' : ''} ${i < currentChapter ? 'completed' : ''}`}
            onClick={() => setCurrentChapter(i)}
            title={ch.title}
          />
        ))}
      </div>

      {/* Chapter Card */}
      <div
        className="story-chapter animate-fade-in"
        key={chapter.id}
        ref={(el) => { chapterRefs.current[currentChapter] = el; }}
        style={{ '--chapter-color': chapter.color } as React.CSSProperties}
      >
        {/* Chapter Header */}
        <div className="story-chapter-header">
          <div className="story-emoji" style={{ color: chapter.color }}>
            {chapterIcons[chapter.id] || <span style={{ fontSize: '2rem' }}>{chapter.emoji}</span>}
          </div>
          <div className="story-chapter-number">
            Chapter {currentChapter + 1} of {chapters.length}
          </div>
        </div>

        <h1 className="story-title">{chapter.title}</h1>
        <p className="story-subtitle">{chapter.subtitle}</p>

        {/* Chapter Value */}
        {chapter.value !== null && chapter.value !== undefined && (
          <div className="story-value-container">
            <div className="story-value" style={{ color: chapter.color }}>
              <AnimatedCounter target={chapter.value} duration={1800} />
            </div>
            {chapter.id === 'surplus' && (
              <div className="story-value-label">per month • ready to invest</div>
            )}
            {chapter.id === 'earning' && (
              <div className="story-value-label">monthly take-home salary</div>
            )}
            {chapter.id === 'spending' && (
              <div className="story-value-label">fixed monthly obligations</div>
            )}
          </div>
        )}

        {/* Allocation Breakdown (Chapter 4) */}
        {chapter.id === 'allocation' && chapter.breakdown && (
          <div className="story-allocation">
            <AllocationDonut breakdown={chapter.breakdown} />
            <div className="allocation-grid">
              {chapter.breakdown.map((b: any, i: number) => (
                <div key={i} className="allocation-item">
                  <div className="alloc-bar" style={{ backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length], width: `${b.weight}%` }} />
                  <div className="alloc-info">
                    <span className="alloc-name">{b.name}</span>
                    <span className="alloc-amount">₹{b.monthlyAmount?.toLocaleString('en-IN')}/mo</span>
                  </div>
                  <div className="alloc-meta">
                    <span>{b.weight}%</span>
                    <span className="alloc-return">↑ {b.expectedReturn}% p.a.</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sharpe Ratio Badge */}
            <div className="sharpe-badge">
              <Brain size={16} />
              <span>Sharpe Ratio: <strong>{plan.portfolioMetrics.sharpeRatio}</strong></span>
              <span className="sharpe-explain">
                {plan.portfolioMetrics.sharpeRatio > 0.5 ? '✓ Good risk-adjusted returns' : '⚠ Consider adjusting allocation'}
              </span>
            </div>
          </div>
        )}

        {/* Monte Carlo Chart (Chapter 5) */}
        {chapter.id === 'projection' && plan.simulation?.yearlyData && (
          <div className="story-projection">
            <MonteCarloChart yearlyData={plan.simulation.yearlyData} />
            <div className="projection-bands">
              <div className="band optimistic">
                <span className="band-label">🎯 Best Case</span>
                <span className="band-value">₹{plan.simulation.summary.optimistic?.toLocaleString('en-IN')}</span>
              </div>
              <div className="band median">
                <span className="band-label">📊 Most Likely</span>
                <span className="band-value">₹{plan.simulation.summary.median?.toLocaleString('en-IN')}</span>
              </div>
              <div className="band pessimistic">
                <span className="band-label">🛡️ Worst Case</span>
                <span className="band-value">₹{plan.simulation.summary.pessimistic?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Retirement Details (Chapter 6) */}
        {chapter.id === 'retirement' && plan.retirement && (
          <div className="story-retirement">
            <div className="retirement-cards">
              <div className="retirement-card">
                <span className="ret-label">Projected Wealth</span>
                <span className="ret-value text-gradient">
                  ₹{plan.retirement.projectedWealth?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="retirement-card">
                <span className="ret-label">Inflation-Adjusted</span>
                <span className="ret-value" style={{ color: 'var(--text-main)' }}>
                  ₹{plan.retirement.inflationAdjusted?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="retirement-card">
                <span className="ret-label">Years to Freedom</span>
                <span className="ret-value" style={{ color: '#10b981', fontSize: '2.5rem' }}>
                  {plan.retirement.yearsToRetirement}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="story-nav">
        <button
          className="story-nav-btn"
          onClick={prevChapter}
          disabled={!canGoPrev}
        >
          <ArrowLeft size={20} /> Back
        </button>

        <button
          className="story-nav-btn primary"
          onClick={canGoNext ? nextChapter : scrollToMarkets}
        >
          {canGoNext ? (
            <>Next Chapter <ArrowRight size={20} /></>
          ) : (
            <>Explore Markets <Globe size={20} /></>
          )}
        </button>
      </div>

      {/* Goal Analysis Section */}
      {plan.goalAnalysis && plan.goalAnalysis.length > 0 && currentChapter >= 3 && (
        <div className="story-goals-section">
          <h3 className="section-title">
            <BarChart3 size={20} /> Goal Intelligence
          </h3>
          <div className="goals-grid">
            {plan.goalAnalysis.map((goal: any, i: number) => (
              <div key={i} className={`goal-card ${goal.isFeasible ? 'feasible' : 'stretch'}`}>
                <div className="goal-header">
                  <span className="goal-icon">{goal.icon || '🎯'}</span>
                  <span className={`goal-badge ${goal.isFeasible ? 'green' : 'amber'}`}>
                    {goal.isFeasible ? '✓ Feasible' : '⚡ Stretch'}
                  </span>
                </div>
                <h4>{goal.name}</h4>
                <div className="goal-details">
                  <div className="goal-detail">
                    <span>Target</span>
                    <strong>₹{goal.targetAmount?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="goal-detail">
                    <span>Required SIP</span>
                    <strong>₹{goal.requiredSIP?.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div className="goal-detail">
                    <span>Wealth Gain</span>
                    <strong style={{ color: '#10b981' }}>₹{goal.wealthGain?.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                <p className="goal-recommendation">{goal.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Markets Section */}
      {showMarkets && (
        <div className="story-markets-section animate-fade-in" ref={marketsRef}>
          <div className="markets-header">
            <h3 className="section-title">
              <Activity size={20} /> Live Market Pulse
            </h3>
            <button className="refresh-btn" onClick={loadMarkets} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="market-tabs">
            <button className={`market-tab ${marketTab === 'indices' ? 'active' : ''}`} onClick={() => setMarketTab('indices')}>
              <TrendingUp size={16} /> Indices
            </button>
            <button className={`market-tab ${marketTab === 'forex' ? 'active' : ''}`} onClick={() => setMarketTab('forex')}>
              <Globe size={16} /> Forex
            </button>
            <button className={`market-tab ${marketTab === 'crypto' ? 'active' : ''}`} onClick={() => setMarketTab('crypto')}>
              <Coins size={16} /> Crypto & NFT
            </button>
            <button className={`market-tab ${marketTab === 'mf' ? 'active' : ''}`} onClick={() => setMarketTab('mf')}>
              <BarChart3 size={16} /> Mutual Funds
            </button>
          </div>

          {/* Indices */}
          {marketTab === 'indices' && markets.indices && (
            <div className="market-grid">
              {['sensex', 'nifty'].map(key => {
                const idx = markets.indices[key];
                if (!idx) return null;
                return (
                  <div key={key} className="market-card">
                    <h4>{idx.name}</h4>
                    <div className="market-price">{idx.price?.toLocaleString('en-IN')}</div>
                    <div className={`market-change ${idx.changePercent >= 0 ? 'positive' : 'negative'}`}>
                      {idx.changePercent >= 0 ? '▲' : '▼'} {Math.abs(idx.change)} ({idx.changePercent}%)
                    </div>
                    <div className="market-meta">
                      <span>H: {idx.dayHigh?.toLocaleString('en-IN')}</span>
                      <span>L: {idx.dayLow?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Forex */}
          {marketTab === 'forex' && markets.forex?.pairs && (
            <div className="market-grid three-col">
              {markets.forex.pairs.map((pair: any, i: number) => (
                <div key={i} className="market-card compact">
                  <h4>{pair.symbol}</h4>
                  <div className="market-price">₹{pair.rate}</div>
                  <div className={`strength-badge ${pair.direction}`}>{pair.direction}</div>
                </div>
              ))}
            </div>
          )}

          {/* Crypto */}
          {marketTab === 'crypto' && markets.crypto?.topCoins && (
            <div className="market-grid three-col">
              {markets.crypto.topCoins.slice(0, 6).map((coin: any, i: number) => (
                <div key={i} className="market-card compact">
                  <div className="crypto-header">
                    {coin.image && <img src={coin.image} alt={coin.symbol} className="crypto-icon" />}
                    <h4>{coin.symbol}</h4>
                  </div>
                  <div className="market-price">₹{coin.currentPrice?.toLocaleString('en-IN')}</div>
                  <div className={`market-change ${coin.priceChangePercent24h >= 0 ? 'positive' : 'negative'}`}>
                    {coin.priceChangePercent24h >= 0 ? '▲' : '▼'} {Math.abs(coin.priceChangePercent24h)}%
                  </div>
                </div>
              ))}

              {/* NFT Section */}
              {markets.crypto.nftTrending && markets.crypto.nftTrending.length > 0 && (
                <>
                  <div className="market-section-divider">
                    <span>🖼️ Trending NFTs</span>
                  </div>
                  {markets.crypto.nftTrending.map((nft: any, i: number) => (
                    <div key={`nft-${i}`} className="market-card compact nft-card">
                      <div className="crypto-header">
                        {nft.thumb && <img src={nft.thumb} alt={nft.name} className="crypto-icon" />}
                        <h4>{nft.name || nft.symbol}</h4>
                      </div>
                      {nft.floorPrice24hChange !== undefined && (
                        <div className={`market-change ${nft.floorPrice24hChange >= 0 ? 'positive' : 'negative'}`}>
                          Floor: {nft.floorPrice24hChange >= 0 ? '▲' : '▼'} {Math.abs(nft.floorPrice24hChange).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Mutual Funds */}
          {marketTab === 'mf' && markets.mutualFunds?.schemes && (
            <div className="mf-list">
              {markets.mutualFunds.schemes.map((mf: any, i: number) => (
                <div key={i} className="mf-card">
                  <div className="mf-info">
                    <h4>{mf.schemeName || mf.name}</h4>
                    <span className="mf-category">{mf.category}</span>
                  </div>
                  <div className="mf-nav">
                    <div className="mf-nav-value">₹{mf.nav}</div>
                    <div className={`market-change ${mf.dayChangePercent >= 0 ? 'positive' : 'negative'}`}>
                      {mf.dayChangePercent >= 0 ? '▲' : '▼'} {Math.abs(mf.dayChangePercent)}%
                    </div>
                  </div>
                  <div className="mf-returns">
                    <span className={mf.oneYearReturn >= 0 ? 'positive' : 'negative'}>
                      1Y: {mf.oneYearReturn >= 0 ? '+' : ''}{mf.oneYearReturn}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scroll Indicator */}
      {!showMarkets && currentChapter === chapters.length - 1 && (
        <div className="scroll-indicator" onClick={scrollToMarkets}>
          <ChevronDown size={20} />
          <span>Tap to explore live markets</span>
        </div>
      )}
    </div>
  );
};

export default MoneyStory;
