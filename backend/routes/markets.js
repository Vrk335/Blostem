/**
 * Market Data API Routes
 * 
 * Server-side cached endpoints for Forex, Crypto/NFT, Sensex/NIFTY, and Mutual Funds.
 * Uses free public APIs with no API keys required.
 * Cache TTLs prevent rate limiting and reduce latency.
 */

import express from 'express';
import cache from '../services/cache.js';

const router = express.Router();

// ── Utility: Fetch with timeout ───────────────────────────────────
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ── 1. FOREX — INR Exchange Rates ─────────────────────────────────
// Source: ExchangeRate-API (free, no key)
router.get('/forex', async (req, res) => {
  const CACHE_KEY = 'market:forex';
  const CACHE_TTL = 300; // 5 minutes

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ status: 'success', source: 'cache', data: cached });

    const data = await fetchWithTimeout('https://open.er-api.com/v6/latest/INR');

    const relevantPairs = ['USD', 'EUR', 'GBP', 'JPY', 'AED', 'SGD', 'AUD', 'CAD', 'CHF'];
    const forexData = {
      baseCurrency: 'INR',
      lastUpdated: data.time_last_update_utc || new Date().toISOString(),
      rates: {},
      pairs: [],
    };

    for (const pair of relevantPairs) {
      if (data.rates && data.rates[pair]) {
        const rate = data.rates[pair];
        const inrPerUnit = +(1 / rate).toFixed(4);
        forexData.rates[pair] = inrPerUnit;
        forexData.pairs.push({
          symbol: `${pair}/INR`,
          rate: inrPerUnit,
          direction: pair === 'JPY' ? 'weak' : inrPerUnit > 50 ? 'strong' : 'moderate',
        });
      }
    }

    cache.set(CACHE_KEY, forexData, CACHE_TTL);
    res.json({ status: 'success', source: 'live', data: forexData });
  } catch (err) {
    console.error('Forex API error:', err.message);
    res.status(502).json({ status: 'error', message: 'Failed to fetch forex data. Try again shortly.' });
  }
});


// ── 2. CRYPTO / NFT ───────────────────────────────────────────────
// Source: CoinGecko Free API (no key needed)
router.get('/crypto', async (req, res) => {
  const CACHE_KEY = 'market:crypto';
  const CACHE_TTL = 300; // 5 minutes

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ status: 'success', source: 'cache', data: cached });

    const [priceData, trendingData] = await Promise.all([
      fetchWithTimeout('https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h,7d'),
      fetchWithTimeout('https://api.coingecko.com/api/v3/search/trending').catch(() => ({ coins: [], nfts: [] })),
    ]);

    const cryptoData = {
      lastUpdated: new Date().toISOString(),
      topCoins: (priceData || []).map(coin => ({
        id: coin.id,
        symbol: coin.symbol?.toUpperCase(),
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        priceChangePercent24h: +(coin.price_change_percentage_24h || 0).toFixed(2),
        priceChangePercent7d: +(coin.price_change_percentage_7d_in_currency || 0).toFixed(2),
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        sparkline: coin.sparkline_in_7d?.price?.filter((_, i) => i % 6 === 0) || [], // Sample every 6th point
        rank: coin.market_cap_rank,
      })),
      trending: (trendingData.coins || []).slice(0, 5).map(t => ({
        name: t.item?.name,
        symbol: t.item?.symbol,
        marketCapRank: t.item?.market_cap_rank,
        thumb: t.item?.thumb,
      })),
      nftTrending: (trendingData.nfts || []).slice(0, 5).map(nft => ({
        name: nft.name,
        symbol: nft.symbol,
        thumb: nft.thumb,
        floorPriceInNativeCurrency: nft.floor_price_in_native_currency,
        floorPrice24hChange: nft.floor_price_24h_percentage_change,
      })),
    };

    cache.set(CACHE_KEY, cryptoData, CACHE_TTL);
    res.json({ status: 'success', source: 'live', data: cryptoData });
  } catch (err) {
    console.error('Crypto API error:', err.message);
    res.status(502).json({ status: 'error', message: 'Failed to fetch crypto data. CoinGecko may be rate-limited. Try again in 60s.' });
  }
});


// ── 3. INDICES — Sensex & NIFTY 50 ───────────────────────────────
// Source: Yahoo Finance (free, no key)
router.get('/indices', async (req, res) => {
  const CACHE_KEY = 'market:indices';
  const CACHE_TTL = 120; // 2 minutes

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ status: 'success', source: 'cache', data: cached });

    const [sensexData, niftyData] = await Promise.all([
      fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?range=5d&interval=1d').catch(() => null),
      fetchWithTimeout('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?range=5d&interval=1d').catch(() => null),
    ]);

    const parseYahoo = (data, name) => {
      if (!data?.chart?.result?.[0]) return { name, price: 0, change: 0, changePercent: 0, history: [] };
      const result = data.chart.result[0];
      const meta = result.meta;
      const closes = result.indicators?.quote?.[0]?.close || [];
      const timestamps = result.timestamp || [];

      const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
      const previousClose = meta.chartPreviousClose || closes[closes.length - 2] || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;

      return {
        name,
        symbol: meta.symbol,
        price: +currentPrice.toFixed(2),
        change: +change.toFixed(2),
        changePercent: +changePercent.toFixed(2),
        dayHigh: meta.regularMarketDayHigh || 0,
        dayLow: meta.regularMarketDayLow || 0,
        volume: meta.regularMarketVolume || 0,
        history: timestamps.map((ts, i) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          close: closes[i] ? +closes[i].toFixed(2) : null,
        })).filter(h => h.close !== null),
      };
    };

    const indicesData = {
      lastUpdated: new Date().toISOString(),
      sensex: parseYahoo(sensexData, 'BSE Sensex'),
      nifty: parseYahoo(niftyData, 'NIFTY 50'),
    };

    cache.set(CACHE_KEY, indicesData, CACHE_TTL);
    res.json({ status: 'success', source: 'live', data: indicesData });
  } catch (err) {
    console.error('Indices API error:', err.message);
    res.status(502).json({ status: 'error', message: 'Failed to fetch index data' });
  }
});


// ── 4. MUTUAL FUNDS ──────────────────────────────────────────────
// Source: MFAPI.in (free, no key, Indian MF data)
router.get('/mutual-funds', async (req, res) => {
  const CACHE_KEY = 'market:mf';
  const CACHE_TTL = 900; // 15 minutes

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ status: 'success', source: 'cache', data: cached });

    // Popular MF scheme codes from AMFI
    const schemes = [
      { code: '120505', name: 'Axis Bluechip Fund', category: 'Large Cap' },
      { code: '118551', name: 'Mirae Asset Large Cap Fund', category: 'Large Cap' },
      { code: '120503', name: 'Axis Midcap Fund', category: 'Mid Cap' },
      { code: '125354', name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap' },
      { code: '119598', name: 'SBI Small Cap Fund', category: 'Small Cap' },
      { code: '100119', name: 'ICICI Pru Equity & Debt Fund', category: 'Hybrid' },
      { code: '119551', name: 'SBI Magnum Medium Duration Fund', category: 'Debt' },
      { code: '120716', name: 'Kotak Gold Fund', category: 'Gold' },
    ];

    const results = await Promise.allSettled(
      schemes.map(s =>
        fetchWithTimeout(`https://api.mfapi.in/mf/${s.code}/latest`, 5000)
          .then(data => ({ ...s, navData: data }))
      )
    );

    const mfData = {
      lastUpdated: new Date().toISOString(),
      schemes: results
        .filter(r => r.status === 'fulfilled')
        .map(r => {
          const s = r.value;
          const navHistory = s.navData?.data || [];
          const latestNav = navHistory[0] ? parseFloat(navHistory[0].nav) : 0;
          const prevNav = navHistory[1] ? parseFloat(navHistory[1].nav) : latestNav;
          const dayChange = latestNav - prevNav;
          const dayChangePercent = prevNav ? (dayChange / prevNav) * 100 : 0;

          // Calculate 1-year return if we have enough data
          const oneYearAgoNav = navHistory.length > 250 ? parseFloat(navHistory[250]?.nav || navHistory[navHistory.length - 1]?.nav) : prevNav;
          const oneYearReturn = oneYearAgoNav ? ((latestNav - oneYearAgoNav) / oneYearAgoNav) * 100 : 0;

          return {
            code: s.code,
            name: s.name,
            category: s.category,
            nav: +latestNav.toFixed(4),
            dayChange: +dayChange.toFixed(4),
            dayChangePercent: +dayChangePercent.toFixed(2),
            oneYearReturn: +oneYearReturn.toFixed(2),
            navDate: navHistory[0]?.date || '',
            schemeName: s.navData?.meta?.scheme_name || s.name,
          };
        }),
    };

    cache.set(CACHE_KEY, mfData, CACHE_TTL);
    res.json({ status: 'success', source: 'live', data: mfData });
  } catch (err) {
    console.error('MF API error:', err.message);
    res.status(502).json({ status: 'error', message: 'Failed to fetch mutual fund data' });
  }
});


// ── 5. AGGREGATED MARKET SUMMARY ──────────────────────────────────
// Single endpoint that returns a pulse of all markets
router.get('/summary', async (req, res) => {
  const CACHE_KEY = 'market:summary';
  const CACHE_TTL = 120; // 2 minutes

  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.json({ status: 'success', source: 'cache', data: cached });

    // Fetch all in parallel
    const baseUrl = `http://localhost:${req.socket.localPort}`;
    const [forex, crypto, indices, mf] = await Promise.allSettled([
      fetchWithTimeout(`${baseUrl}/api/markets/forex`),
      fetchWithTimeout(`${baseUrl}/api/markets/crypto`),
      fetchWithTimeout(`${baseUrl}/api/markets/indices`),
      fetchWithTimeout(`${baseUrl}/api/markets/mutual-funds`),
    ]);

    const summary = {
      lastUpdated: new Date().toISOString(),
      forex: forex.status === 'fulfilled' ? forex.value.data : null,
      crypto: crypto.status === 'fulfilled' ? crypto.value.data : null,
      indices: indices.status === 'fulfilled' ? indices.value.data : null,
      mutualFunds: mf.status === 'fulfilled' ? mf.value.data : null,
    };

    cache.set(CACHE_KEY, summary, CACHE_TTL);
    res.json({ status: 'success', source: 'live', data: summary });
  } catch (err) {
    console.error('Summary API error:', err.message);
    res.status(502).json({ status: 'error', message: 'Failed to generate market summary' });
  }
});


export default router;
