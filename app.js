/**
 * BLOOMBERG TERMINAL CORE APPLICATION JS
 * Quang Nguyen - Research Consultant @ WorldQuant
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PORTFOLIO_DATA === 'undefined') {
    console.error("PORTFOLIO_DATA not loaded");
    return;
  }

  let soundEnabled = false;
  let audioCtx = null;
  let cmdHistory = [];
  let cmdHistoryIdx = -1;

  function playBeep(freq = 800, duration = 0.05) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio error", e);
    }
  }

  window.toggleSound = function() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (btn) btn.innerText = soundEnabled ? '[AUDIO: ON]' : '[AUDIO: OFF]';
    if (soundEnabled) playBeep(1200, 0.1);
  };

  window.toggleCrt = function() {
    const crt = document.getElementById('crtOverlay');
    if (crt) crt.style.display = crt.style.display === 'none' ? 'block' : 'none';
  };

  // 1. Clock Update
  function updateClock() {
    const now = new Date();
    const utcStr = now.toUTCString().split(' ')[4];
    const topClock = document.getElementById('topClock');
    if (topClock) {
      topClock.innerText = `UTC ${utcStr} | ICT ${now.toLocaleTimeString('vi-VN')}`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Profile Setup
  function initProfile() {
    const p = PORTFOLIO_DATA.profile;
    document.getElementById('userName').innerText = p.name;
    document.getElementById('userTitle').innerText = p.title;
    document.getElementById('profileTicker').innerText = p.ticker;
    document.getElementById('userStatus').innerText = p.status;
    
    if (document.getElementById('contactLinkedin')) {
      document.getElementById('contactLinkedin').href = p.linkedin;
      document.getElementById('contactLinkedin').innerText = p.linkedin;
    }
    if (document.getElementById('contactEmail')) {
      document.getElementById('contactEmail').href = `mailto:${p.email}`;
      document.getElementById('contactEmail').innerText = p.email;
    }
    if (document.getElementById('contactGithub')) {
      document.getElementById('contactGithub').href = p.github;
      document.getElementById('contactGithub').innerText = p.github;
    }

    const bioContainer = document.getElementById('userBio');
    if (bioContainer) {
      bioContainer.innerHTML = p.bio.map(para => `<p style="color: var(--gray-light); line-height: 1.5;">${para}</p>`).join('');
    }
  }

  // 3. Live WebSocket Ticker Connection (Binance Public Stream)
  let liveTickers = [...PORTFOLIO_DATA.liveSymbols];

  function renderTickerTrack() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const renderItems = () => {
      return liveTickers.map(t => {
        let cls = 'ticker-neutral';
        if (t.dir === 'up') cls = 'ticker-up';
        if (t.dir === 'down') cls = 'ticker-down';
        const formattedPrice = typeof t.price === 'number' ? t.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : t.price;
        const liveBadge = t.isLive ? '<span style="font-size:9px; color:var(--green); border:1px solid var(--green); padding:0 2px;">LIVE</span>' : '';
        return `
          <div class="ticker-item">
            <span class="ticker-symbol">${t.symbol} ${liveBadge}</span>
            <span class="ticker-price">${formattedPrice}</span>
            <span class="${cls}">${t.change}</span>
          </div>
        `;
      }).join('');
    };

    track.innerHTML = renderItems() + renderItems();
  }

  function initLiveTickerWebsocket() {
    try {
      const streams = liveTickers.filter(t => t.isLive).map(t => t.wsStream).join('/');
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        const badge = document.getElementById('wsStatusText');
        if (badge) badge.innerText = "WEBSOCKET LIVE";
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.s) {
          const symName = data.s.replace('USDT', '/USDT');
          const idx = liveTickers.findIndex(t => t.symbol === symName);
          if (idx !== -1) {
            const oldPrice = liveTickers[idx].price;
            const newPrice = parseFloat(data.c);
            const changePct = parseFloat(data.P);
            const isUp = newPrice >= oldPrice;
            
            liveTickers[idx].price = newPrice;
            liveTickers[idx].change = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
            liveTickers[idx].dir = isUp ? 'up' : 'down';
            renderTickerTrack();
          }
        }
      };

      ws.onerror = () => {
        console.warn("WebSocket fallback");
      };
    } catch (e) {
      console.warn("WebSocket init error", e);
    }
  }

  // 4. Live L2 market depth, quote, and movement streams (Binance Public WebSocket)
  function initLiveL2OrderBook() {
    const dom = {
      asks: document.getElementById('l2Asks'),
      bids: document.getElementById('l2Bids'),
      status: document.getElementById('l2Status'),
      statusWrap: document.getElementById('l2StatusWrap'),
      statusDot: document.getElementById('l2StatusDot'),
      statusDetail: document.getElementById('l2StatusDetail'),
      lastTrade: document.getElementById('l2LastTrade'),
      tradeDirection: document.getElementById('l2TradeDirection'),
      move5s: document.getElementById('l2Move5s'),
      high60s: document.getElementById('l2High60s'),
      low60s: document.getElementById('l2Low60s'),
      lastSize: document.getElementById('l2LastSize'),
      sparkline: document.getElementById('l2Sparkline'),
      sparklineRange: document.getElementById('l2SparklineRange'),
      bestBid: document.getElementById('l2BestBid'),
      bestAsk: document.getElementById('l2BestAsk'),
      spread: document.getElementById('l2Spread'),
      microprice: document.getElementById('l2Microprice'),
      midPrice: document.getElementById('l2MidPrice'),
      imbalance: document.getElementById('l2Ofi'),
      bidBar: document.getElementById('bidBarRatio'),
      askBar: document.getElementById('askBarRatio'),
      bidPercent: document.getElementById('bidPercentText'),
      askPercent: document.getElementById('askPercentText'),
      updated: document.getElementById('l2Updated'),
    };

    if (!dom.asks || !dom.bids) return;
    if (!window.MarketMetrics) {
      setL2Status('stale', 'METRICS MODULE UNAVAILABLE — live data is not being displayed.');
      return;
    }

    const { calculateBookMetrics, calculateMovement, formatQuantity, formatSignedPercent, updateMovementWindow } = window.MarketMetrics;
    const displayLevelCount = 12;
    const movementWindowMs = 60_000;
    const streamUrl = 'wss://stream.binance.com:9443/stream?streams=btcusdt@depth20@100ms/btcusdt@bookTicker/btcusdt@aggTrade';
    const state = {
      asks: [],
      bids: [],
      bestQuote: null,
      movement: [],
      lastAggressor: null,
      lastPacketAt: 0,
      lastTrade: null,
      reconnectAttempt: 0,
      renderTimer: null,
      reconnectTimer: null,
      socket: null,
    };

    function setL2Status(kind, detail) {
      const label = kind === 'live' ? 'LIVE' : kind === 'stale' ? 'STALE' : 'CONNECTING';
      if (dom.status) dom.status.innerText = label;
      if (dom.statusWrap) dom.statusWrap.className = `l2-connection l2-connection--${kind}`;
      if (dom.statusDot) dom.statusDot.setAttribute('aria-label', `L2 stream ${label.toLowerCase()}`);
      if (dom.statusDetail) dom.statusDetail.innerText = detail;
    }

    function formatPrice(value) {
      return Number.isFinite(value) ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
    }

    function formatSize(value) {
      return formatQuantity(value);
    }

    function formatTime(timestamp) {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(timestamp);
    }

    function renderLevels(element, levels, side) {
      const maxSize = Math.max(...levels.map((level) => Number.parseFloat(level[1]) || 0), 0.000001);
      const orderedLevels = side === 'ask' ? levels.slice().reverse() : levels;
      element.innerHTML = orderedLevels.map((level) => {
        const price = Number.parseFloat(level[0]);
        const quantity = Number.parseFloat(level[1]);
        const depth = Math.min(100, (quantity / maxSize) * 100);
        return `<div class="l2-level l2-level--${side}" style="--depth:${depth.toFixed(1)}%"><span>${formatPrice(price)}</span><span>${formatSize(quantity)}</span></div>`;
      }).join('');
    }

    function renderSparkline(points) {
      if (!dom.sparkline || !points.length) return;
      const prices = points.map((point) => point.price);
      const low = Math.min(...prices);
      const high = Math.max(...prices);
      const range = high - low || 1;
      const denominator = Math.max(points.length - 1, 1);
      const coordinates = points.map((point, index) => {
        const x = (index / denominator) * 100;
        const y = 26 - ((point.price - low) / range) * 24;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      dom.sparkline.setAttribute('points', coordinates);
      if (dom.sparklineRange) dom.sparklineRange.innerText = `${formatPrice(low)} — ${formatPrice(high)}`;
    }

    function colorMovement(element, value) {
      if (!element) return;
      element.style.color = value > 0 ? 'var(--green)' : value < 0 ? 'var(--red)' : 'var(--cyan)';
    }

    function render() {
      state.renderTimer = null;
      if (!state.bids.length || !state.asks.length) return;

      const visibleBids = state.bids.slice(0, displayLevelCount);
      const visibleAsks = state.asks.slice(0, displayLevelCount);
      const book = calculateBookMetrics(visibleBids, visibleAsks);
      if (state.bestQuote) {
        const quote = calculateBookMetrics(
          [[state.bestQuote.bid, state.bestQuote.bidQuantity]],
          [[state.bestQuote.ask, state.bestQuote.askQuantity]],
        );
        book.bestBid = quote.bestBid;
        book.bestAsk = quote.bestAsk;
        book.midPrice = quote.midPrice;
        book.spread = quote.spread;
        book.spreadBps = quote.spreadBps;
        book.microprice = quote.microprice;
      }
      const now = Date.now();
      const movement5s = calculateMovement(state.movement.filter((point) => point.timestamp >= now - 5_000));
      const movement60s = calculateMovement(state.movement);
      const imbalance = book.bidPressure - book.askPressure;

      renderLevels(dom.asks, visibleAsks, 'ask');
      renderLevels(dom.bids, visibleBids, 'bid');

      if (dom.bestBid) dom.bestBid.innerText = formatPrice(book.bestBid);
      if (dom.bestAsk) dom.bestAsk.innerText = formatPrice(book.bestAsk);
      if (dom.spread) dom.spread.innerText = `${formatPrice(book.spread)} / ${book.spreadBps.toFixed(2)} bps`;
      if (dom.microprice) dom.microprice.innerText = formatPrice(book.microprice);
      if (dom.midPrice) dom.midPrice.innerText = formatPrice(book.midPrice);
      if (dom.imbalance) dom.imbalance.innerText = `BOOK IMBALANCE ${imbalance >= 0 ? '+' : ''}${imbalance.toFixed(1)}%`;
      if (dom.bidBar) dom.bidBar.style.width = `${book.bidPressure}%`;
      if (dom.askBar) dom.askBar.style.width = `${book.askPressure}%`;
      if (dom.bidPercent) dom.bidPercent.innerText = `BIDS: ${book.bidPressure.toFixed(1)}%`;
      if (dom.askPercent) dom.askPercent.innerText = `ASKS: ${book.askPressure.toFixed(1)}%`;
      if (dom.move5s) dom.move5s.innerText = formatSignedPercent(movement5s.changePercent);
      colorMovement(dom.move5s, movement5s.changePercent);
      if (dom.high60s) dom.high60s.innerText = formatPrice(movement60s.high);
      if (dom.low60s) dom.low60s.innerText = formatPrice(movement60s.low);
      if (dom.updated) dom.updated.innerText = state.lastPacketAt ? `${formatTime(state.lastPacketAt)} ICT` : 'WAITING';
      renderSparkline(state.movement);

      if (state.lastTrade) {
        if (dom.lastTrade) dom.lastTrade.innerText = formatPrice(state.lastTrade.price);
        if (dom.lastSize) dom.lastSize.innerText = formatSize(state.lastTrade.quantity);
        if (dom.tradeDirection) {
          dom.tradeDirection.innerText = state.lastAggressor === 'buy' ? 'BUY MARKET' : 'SELL MARKET';
          dom.tradeDirection.className = `l2-trade-side l2-trade-side--${state.lastAggressor}`;
        }
      }
    }

    function scheduleRender() {
      if (state.renderTimer) return;
      state.renderTimer = window.setTimeout(render, 100);
    }

    function scheduleReconnect() {
      if (state.reconnectTimer) return;
      const delay = Math.min(1_000 * (2 ** state.reconnectAttempt), 15_000);
      state.reconnectAttempt += 1;
      setL2Status('stale', `STREAM CLOSED — reconnecting in ${(delay / 1_000).toFixed(0)}s.`);
      state.reconnectTimer = window.setTimeout(() => {
        state.reconnectTimer = null;
        connect();
      }, delay);
    }

    function handleMessage(message) {
      const payload = message.data || message;
      const stream = message.stream || '';
      const receivedAt = Date.now();
      state.lastPacketAt = receivedAt;
      state.reconnectAttempt = 0;

      if (stream.includes('@depth') || (Array.isArray(payload.bids) && Array.isArray(payload.asks))) {
        state.bids = payload.bids;
        state.asks = payload.asks;
      }

      if (stream.includes('@bookTicker') || (payload.b && payload.a && payload.B && payload.A)) {
        const bestQuote = {
          bid: Number.parseFloat(payload.b),
          bidQuantity: Number.parseFloat(payload.B),
          ask: Number.parseFloat(payload.a),
          askQuantity: Number.parseFloat(payload.A),
        };
        if (Object.values(bestQuote).every(Number.isFinite)) state.bestQuote = bestQuote;
      }

      if (stream.includes('@aggTrade') || (payload.p && typeof payload.m === 'boolean')) {
        const price = Number.parseFloat(payload.p);
        const quantity = Number.parseFloat(payload.q);
        if (Number.isFinite(price) && Number.isFinite(quantity)) {
          state.lastTrade = { price, quantity };
          // Binance marks `m` true when the buyer provided resting liquidity, so the seller was aggressive.
          state.lastAggressor = payload.m ? 'sell' : 'buy';
          state.movement = updateMovementWindow(state.movement, { timestamp: receivedAt, price }, movementWindowMs);
        }
      }

      setL2Status('live', `LIVE · Binance public stream · last market packet ${formatTime(receivedAt)} ICT`);
      scheduleRender();
    }

    function connect() {
      setL2Status('connecting', 'Opening Binance public market-data stream…');
      try {
        const socket = new WebSocket(streamUrl);
        state.socket = socket;
        socket.onopen = () => setL2Status('connecting', 'Subscribed to depth, best quote, and aggregate trades…');
        socket.onmessage = (event) => {
          try {
            handleMessage(JSON.parse(event.data));
          } catch (error) {
            console.warn('L2 message parse error', error);
          }
        };
        socket.onerror = () => setL2Status('stale', 'STREAM ERROR — waiting for the connection to close and retry.');
        socket.onclose = scheduleReconnect;
      } catch (error) {
        console.warn('L2 stream initialization error', error);
        scheduleReconnect();
      }
    }

    window.setInterval(() => {
      if (!state.lastPacketAt) return;
      const age = Date.now() - state.lastPacketAt;
      if (age > 3_000 && state.socket?.readyState === WebSocket.OPEN) {
        setL2Status('stale', `NO MARKET PACKET FOR ${(age / 1_000).toFixed(1)}s — checking connection.`);
      }
      if (age > 12_000 && state.socket?.readyState === WebSocket.OPEN) state.socket.close();
    }, 1_000);

    connect();
  }

  // 5. Populate Projects
  function initProjects() {
    const container = document.getElementById('projectList');
    if (!container) return;

    container.innerHTML = PORTFOLIO_DATA.projects.map(proj => `
      <div class="strategy-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="strategy-code">${proj.code}</span>
          <a href="${proj.link}" target="_blank" class="bloomberg-link" style="font-size: 11px;">VIEW ON GITHUB &lt;GO&gt;</a>
        </div>
        <div class="strategy-title">${proj.name}</div>
        <div class="strategy-desc">${proj.summary}</div>
        <div style="color: var(--green); font-size: 12px; margin-top: 4px;">
          <strong>RESULT:</strong> ${proj.result}
        </div>
        <div class="tag-list">
          ${proj.stack.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // 6. Populate Strategies & Skills & Timeline
  function initContent() {
    const stratContainer = document.getElementById('strategyList');
    if (stratContainer) {
      stratContainer.innerHTML = PORTFOLIO_DATA.strategies.map(s => `
        <div class="strategy-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="strategy-code">${s.code}</span>
            <span style="color: var(--cyan); font-size: 12px; font-weight: bold;">${s.allocation}</span>
          </div>
          <div class="strategy-title">${s.name}</div>
          <div class="strategy-desc">${s.description}</div>
          <div class="tag-list">
            ${s.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
      `).join('');
    }

    const sk = PORTFOLIO_DATA.skills;
    const populateTags = (elementId, list) => {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = list.map(item => `<span class="tag">${item}</span>`).join('');
    };
    populateTags('skillsLanguages', sk.languages);
    populateTags('skillsLibraries', sk.libraries);
    populateTags('skillsDomains', sk.domains);
    populateTags('skillsPlatforms', sk.platforms);

    const expContainer = document.getElementById('expTimeline');
    if (expContainer) {
      expContainer.innerHTML = PORTFOLIO_DATA.experience.map(item => `
        <div class="timeline-item">
          <div class="timeline-period">${item.period}</div>
          <div class="timeline-role">${item.role}</div>
          <div class="timeline-company">${item.company}</div>
          <ul class="timeline-bullets">
            ${item.details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    }

    const eduContainer = document.getElementById('eduTimeline');
    if (eduContainer) {
      eduContainer.innerHTML = PORTFOLIO_DATA.education.map(item => `
        <div class="timeline-item">
          <div class="timeline-period">${item.period}</div>
          <div class="timeline-role">${item.degree}</div>
          <div class="timeline-company">${item.institution}</div>
          <div style="color: var(--gray-light); font-size: 12px;">${item.notes}</div>
        </div>
      `).join('');
    }
  }

  // 7. Tab Navigation
  window.switchTab = function(tabId) {
    playBeep(900, 0.04);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });
  };

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 8. Command Line Parser
  const cliInput = document.getElementById('cliInput');
  const cliSubmit = document.getElementById('cliSubmit');
  const cliOutput = document.getElementById('cliOutput');

  function logCliOutput(msg, isError = false) {
    if (!cliOutput) return;
    cliOutput.classList.add('active');
    const color = isError ? 'var(--red)' : 'var(--green)';
    cliOutput.innerHTML += `<div style="color: ${color}; font-family: var(--font-mono); margin-bottom: 4px;">&gt; ${msg}</div>`;
    cliOutput.scrollTop = cliOutput.scrollHeight;
  }

  function handleCommand(cmdRaw) {
    const cmd = cmdRaw.trim().toLowerCase();
    if (!cmd) return;

    cmdHistory.push(cmdRaw);
    cmdHistoryIdx = cmdHistory.length;

    playBeep(1100, 0.05);
    logCliOutput(`EXEC: ${cmdRaw.toUpperCase()}`);

    switch (cmd) {
      case 'help': case '?':
        logCliOutput("AVAILABLE COMMANDS:");
        logCliOutput("  1 or BIO       - Profile Overview & Research Philosophy");
        logCliOutput("  2 or RES       - Core Quantitative Research & Methods");
        logCliOutput("  3 or PROJ      - Real Quantitative Projects & Repos");
        logCliOutput("  4 or TECH      - Quantitative Skills & Toolbox");
        logCliOutput("  5 or CAREER    - WorldQuant & Education Timeline");
        logCliOutput("  6 or L2        - Live WebSocket Order Book Depth");
        logCliOutput("  7 or MSG       - Contact Channels & Dispatch");
        logCliOutput("  CLEAR          - Clear terminal logs");
        logCliOutput("  GIT            - Open GitHub (guangnn-161)");
        logCliOutput("  LINKEDIN       - Open LinkedIn Profile");
        logCliOutput("  SOUND          - Toggle Audio Feedback");
        break;

      case '1': case 'bio': switchTab('tab-bio'); logCliOutput("LOADED: 1<GO> BIO PROFILE"); break;
      case '2': case 'res': case 'strat': switchTab('tab-strat'); logCliOutput("LOADED: 2<GO> RESEARCH"); break;
      case '3': case 'proj': case 'projects': switchTab('tab-projects'); logCliOutput("LOADED: 3<GO> REAL PROJECTS"); break;
      case '4': case 'tech': case 'skills': switchTab('tab-skills'); logCliOutput("LOADED: 4<GO> TECH TOOLBOX"); break;
      case '5': case 'career': case 'exp': switchTab('tab-exp'); logCliOutput("LOADED: 5<GO> CAREER TIMELINE"); break;
      case '6': case 'l2': switchTab('tab-l2'); logCliOutput("LOADED: 6<GO> LIVE L2 ORDER BOOK"); break;
      case '7': case 'msg': case 'contact': switchTab('tab-contact'); logCliOutput("LOADED: 7<GO> CONTACT DIRECTORY"); break;

      case 'clear': case 'cls':
        if (cliOutput) { cliOutput.innerHTML = ''; cliOutput.classList.remove('active'); }
        break;

      case 'git': case 'github':
        window.open(PORTFOLIO_DATA.profile.github, '_blank');
        logCliOutput("OPENING GITHUB REPO...");
        break;

      case 'linkedin':
        window.open(PORTFOLIO_DATA.profile.linkedin, '_blank');
        logCliOutput("OPENING LINKEDIN...");
        break;

      case 'sound':
        window.toggleSound();
        break;

      case 'admin':
      case 'login':
        window.location.href = 'admin.html';
        break;

      case 'vault':
      case 'ls':
        logCliOutput("VAULT: Quản lý kho tài liệu nghiên cứu và CV tại admin.html (Lệnh 'ADMIN')");
        break;

      default:
        logCliOutput(`UNKNOWN COMMAND: "${cmdRaw}". TYPE 'HELP' FOR LIST.`, true);
        break;
    }

    if (cliInput) cliInput.value = '';
  }

  if (cliSubmit && cliInput) {
    cliSubmit.addEventListener('click', () => handleCommand(cliInput.value));
    cliInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCommand(cliInput.value);
      if (e.key === 'ArrowUp') {
        if (cmdHistoryIdx > 0) {
          cmdHistoryIdx--;
          cliInput.value = cmdHistory[cmdHistoryIdx];
        }
      }
      if (e.key === 'ArrowDown') {
        if (cmdHistoryIdx < cmdHistory.length - 1) {
          cmdHistoryIdx++;
          cliInput.value = cmdHistory[cmdHistoryIdx];
        } else {
          cmdHistoryIdx = cmdHistory.length;
          cliInput.value = '';
        }
      }
    });
  }

  // Keyboard shortcut keys (F1-F7)
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'F1') { e.preventDefault(); switchTab('tab-bio'); }
    if (e.key === 'F2') { e.preventDefault(); switchTab('tab-strat'); }
    if (e.key === 'F3') { e.preventDefault(); switchTab('tab-projects'); }
    if (e.key === 'F4') { e.preventDefault(); switchTab('tab-skills'); }
    if (e.key === 'F5') { e.preventDefault(); switchTab('tab-exp'); }
    if (e.key === 'F6') { e.preventDefault(); switchTab('tab-l2'); }
    if (e.key === 'F7') { e.preventDefault(); switchTab('tab-contact'); }
  });

  window.sendTerminalMessage = function() {
    const name = document.getElementById('msgName').value;
    const body = document.getElementById('msgBody').value;
    const status = document.getElementById('msgStatus');

    if (name && body) {
      playBeep(1400, 0.1);
      if (status) status.innerHTML = `✅ MSG SENT TO QUANG NGUYEN DESK. (Simulated broadcast)`;
      logCliOutput(`DISPATCH: Message from ${name}`);
      document.getElementById('msgName').value = '';
      document.getElementById('msgBody').value = '';
    }
  };

  // Init sequence
  initProfile();
  renderTickerTrack();
  initLiveTickerWebsocket();
  initLiveL2OrderBook();
  initProjects();
  initContent();

  // Supabase Realtime & Presence Hooks
  if (typeof initPresenceViewers === 'function') {
    initPresenceViewers();
  }
  if (typeof initRealtimeContent === 'function') {
    initRealtimeContent(() => {
      initProfile();
      initProjects();
      initContent();
    });
  }
});
