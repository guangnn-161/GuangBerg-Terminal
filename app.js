/**
 * BLOOMBERG TERMINAL CORE APPLICATION JS
 * Live WebSocket & Interactive Backtest Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof PORTFOLIO_DATA === 'undefined') {
    console.error("PORTFOLIO_DATA not loaded");
    return;
  }

  let soundEnabled = false;
  let audioCtx = null;
  let activeNavTf = "ALL";
  let cmdHistory = [];
  let cmdHistoryIdx = -1;

  // Audio Beep Generator
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
    document.getElementById('userLocation').innerText = p.location;
    document.getElementById('userStatus').innerText = p.status;
    
    if (document.getElementById('contactLinkedin')) {
      document.getElementById('contactLinkedin').href = p.linkedin;
      document.getElementById('contactLinkedin').innerText = p.linkedin;
    }
    if (document.getElementById('contactEmail')) {
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

    const m = PORTFOLIO_DATA.metrics;
    const qm = document.getElementById('quickMetrics');
    if (qm) {
      qm.innerHTML = `
        <div class="metric-card">
          <div class="label">SHARPE RATIO</div>
          <div class="value cyan">${m.sharpeRatio}</div>
        </div>
        <div class="metric-card">
          <div class="label">SORTINO RATIO</div>
          <div class="value green">${m.sortinoRatio}</div>
        </div>
        <div class="metric-card">
          <div class="label">ANNUAL CAGR</div>
          <div class="value amber">${m.cagr}</div>
        </div>
        <div class="metric-card">
          <div class="label">MAX DRAWDOWN</div>
          <div class="value green">${m.maxDrawdown}</div>
        </div>
      `;
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
        console.warn("WebSocket fallback to tick simulation");
      };
    } catch (e) {
      console.warn("WebSocket init error", e);
    }
  }

  // 4. Live L2 Order Book WebSocket Stream
  function initLiveL2OrderBook() {
    const l2Asks = document.getElementById('l2Asks');
    const l2Bids = document.getElementById('l2Bids');
    const l2LastPrice = document.getElementById('l2LastPrice');
    const l2Ofi = document.getElementById('l2Ofi');

    if (!l2Asks || !l2Bids) return;

    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth5@100ms');

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.asks && data.bids) {
          let totalBidVol = 0;
          let totalAskVol = 0;

          // Asks (Sells - Top 5)
          const asksHtml = data.asks.slice().reverse().map(ask => {
            const price = parseFloat(ask[0]).toFixed(2);
            const qty = parseFloat(ask[1]).toFixed(3);
            totalAskVol += parseFloat(qty);
            return `
              <div style="display:flex; justify-content:space-between; background: rgba(255,51,68,0.1); padding: 2px 4px;">
                <span style="color:var(--red); font-weight:bold;">${price}</span>
                <span style="color:var(--white);">${qty}</span>
              </div>
            `;
          }).join('');
          l2Asks.innerHTML = asksHtml;

          // Bids (Buys - Top 5)
          const bidsHtml = data.bids.map(bid => {
            const price = parseFloat(bid[0]).toFixed(2);
            const qty = parseFloat(bid[1]).toFixed(3);
            totalBidVol += parseFloat(qty);
            return `
              <div style="display:flex; justify-content:space-between; background: rgba(0,255,102,0.1); padding: 2px 4px;">
                <span style="color:var(--green); font-weight:bold;">${price}</span>
                <span style="color:var(--white);">${qty}</span>
              </div>
            `;
          }).join('');
          l2Bids.innerHTML = bidsHtml;

          const midPrice = ((parseFloat(data.bids[0][0]) + parseFloat(data.asks[0][0])) / 2).toFixed(2);
          if (l2LastPrice) l2LastPrice.innerText = midPrice;

          // OFI Calculation
          const totalVol = totalBidVol + totalAskVol;
          const bidRatio = totalVol > 0 ? (totalBidVol / totalVol) * 100 : 50;
          const askRatio = 100 - bidRatio;
          const ofiVal = ((totalBidVol - totalAskVol) / totalVol).toFixed(2);

          if (l2Ofi) l2Ofi.innerText = `OFI: ${ofiVal >= 0 ? '+' : ''}${ofiVal}`;
          
          const bidBar = document.getElementById('bidBarRatio');
          const askBar = document.getElementById('askBarRatio');
          const bidText = document.getElementById('bidPercentText');
          const askText = document.getElementById('askPercentText');

          if (bidBar) bidBar.style.width = `${bidRatio.toFixed(1)}%`;
          if (askBar) askBar.style.width = `${askRatio.toFixed(1)}%`;
          if (bidText) bidText.innerText = `BIDS: ${bidRatio.toFixed(1)}%`;
          if (askText) askText.innerText = `ASKS: ${askRatio.toFixed(1)}%`;
        }
      };
    } catch (e) {
      console.warn("L2 depth ws error", e);
    }
  }

  // 5. Populate Strategies & Skills & Timeline
  function initContent() {
    const stratContainer = document.getElementById('strategyList');
    if (stratContainer) {
      stratContainer.innerHTML = PORTFOLIO_DATA.strategies.map(s => `
        <div class="strategy-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="strategy-code">${s.code}</span>
            <span style="color: var(--cyan); font-size: 12px; font-weight: bold;">ALLOCATION: ${s.allocation}</span>
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
    populateTags('skillsInfra', sk.infrastructure);
    populateTags('skillsPlatforms', sk.tradingPlatforms);

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

  // 6. Render NAV Canvas Chart
  function renderNavChart() {
    const canvas = document.getElementById('navChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, width, height);

    const data = PORTFOLIO_DATA.navData[activeNavTf] || PORTFOLIO_DATA.navData["ALL"];
    if (!data || data.length === 0) return;

    const allVals = data.flatMap(d => [d.nav, d.benchmark]);
    const minVal = Math.min(...allVals) * 0.95;
    const maxVal = Math.max(...allVals) * 1.05;

    const getX = (index) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (val) => height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom);

    // Grid
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const v = minVal + (i / 5) * (maxVal - minVal);
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.font = '10px Consolas, monospace';
      ctx.fillText(v.toFixed(0), 10, y + 3);
    }

    // Benchmark (Cyan Dashed)
    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.benchmark);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Strategy Gradient Area
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(255, 157, 0, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 157, 0, 0.0)');

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.nav);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(getX(data.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Strategy NAV Line
    ctx.beginPath();
    ctx.strokeStyle = '#ff9d00';
    ctx.lineWidth = 3;
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.nav);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points & Labels
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.nav);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffb700';
      ctx.fill();

      ctx.fillStyle = '#999';
      ctx.font = '10px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.date, x, height - 15);
    });
  }

  // Timeframe selector buttons
  document.querySelectorAll('.nav-tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNavTf = btn.dataset.tf;
      renderNavChart();
    });
  });

  // 7. Interactive Strategy Backtest Simulator Engine
  function runBacktestSimulator() {
    const lookback = parseInt(document.getElementById('simLookback').value);
    const leverage = parseInt(document.getElementById('simLeverage').value);
    const stopLoss = parseFloat(document.getElementById('simStopLoss').value);
    const stratType = document.getElementById('simStrategyType').value;

    playBeep(1200, 0.08);

    // Calculate synthetic metrics based on parameters
    let baseSharpe = 2.4;
    if (stratType === 'STAT_ARB') baseSharpe = 2.85;
    if (stratType === 'MARKET_MAKING') baseSharpe = 3.12;
    if (stratType === 'MOMENTUM') baseSharpe = 2.65;
    if (stratType === 'VOL_ARB') baseSharpe = 2.95;

    const calcSharpe = (baseSharpe * Math.sqrt(1 + (leverage * 0.1) - (stopLoss * 0.05))).toFixed(2);
    const calcCagr = (18 + leverage * 6.5 - stopLoss * 1.2).toFixed(1);
    const calcMaxDd = (-1.5 * leverage * (1 + stopLoss * 0.3)).toFixed(1);
    const calcWinRate = (60 + Math.random() * 12).toFixed(1);

    document.getElementById('simResultSharpe').innerText = calcSharpe;
    document.getElementById('simResultCagr').innerText = `+${calcCagr}%`;
    document.getElementById('simResultMaxDd').innerText = `${calcMaxDd}%`;
    document.getElementById('simResultWinRate').innerText = `${calcWinRate}%`;

    // Render Canvas Chart for Simulator
    const canvas = document.getElementById('simChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Generate synthetic random walk NAV points
    const points = [];
    let currentNav = 100;
    for (let i = 0; i <= 30; i++) {
      const ret = (Math.random() - 0.43) * 0.03 * leverage;
      currentNav *= (1 + ret);
      points.push(currentNav);
    }

    const minNav = Math.min(...points) * 0.98;
    const maxNav = Math.max(...points) * 1.02;

    const getX = (i) => 20 + (i / 30) * (width - 40);
    const getY = (val) => height - 20 - ((val - minNav) / (maxNav - minNav)) * (height - 40);

    ctx.beginPath();
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    points.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
    ctx.lineTo(getX(30), height - 20);
    ctx.lineTo(getX(0), height - 20);
    ctx.closePath();
    ctx.fill();
  }

  // Slider event listeners
  const simLookback = document.getElementById('simLookback');
  const simLeverage = document.getElementById('simLeverage');
  const simStopLoss = document.getElementById('simStopLoss');
  const btnRunSim = document.getElementById('btnRunSim');

  if (simLookback) simLookback.addEventListener('input', (e) => document.getElementById('valLookback').innerText = `${e.target.value} Days`);
  if (simLeverage) simLeverage.addEventListener('input', (e) => document.getElementById('valLeverage').innerText = `${e.target.value}x`);
  if (simStopLoss) simStopLoss.addEventListener('input', (e) => document.getElementById('valStopLoss').innerText = `${e.target.value}%`);
  if (btnRunSim) btnRunSim.addEventListener('click', runBacktestSimulator);

  // 8. Tab Navigation
  window.switchTab = function(tabId) {
    playBeep(900, 0.04);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    if (tabId === 'tab-perf') setTimeout(renderNavChart, 50);
    if (tabId === 'tab-sim') setTimeout(runBacktestSimulator, 50);
  };

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 9. Command Line Parser
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
      case 'help':
      case '?':
        logCliOutput("AVAILABLE COMMANDS:");
        logCliOutput("  1 or BIO       - Profile Overview");
        logCliOutput("  2 or STRAT     - Quant Strategies & Alpha");
        logCliOutput("  3 or TECH      - Tech Stack & Infrastructure");
        logCliOutput("  4 or NAV       - Interactive NAV Equity Curve");
        logCliOutput("  5 or EXP       - Experience & Education");
        logCliOutput("  6 or MSG       - Contact & LinkedIn");
        logCliOutput("  7 or L2        - Live WebSocket Order Book Depth");
        logCliOutput("  8 or SIM       - Strategy Backtest Simulator");
        logCliOutput("  CLEAR          - Clear terminal output");
        logCliOutput("  LINKEDIN       - Open LinkedIn Profile");
        logCliOutput("  SOUND          - Toggle Audio Feedback");
        break;

      case '1': case 'bio': switchTab('tab-bio'); logCliOutput("LOADED: BIO PROFILE"); break;
      case '2': case 'strat': switchTab('tab-strat'); logCliOutput("LOADED: STRATEGIES"); break;
      case '3': case 'tech': switchTab('tab-skills'); logCliOutput("LOADED: TECH STACK"); break;
      case '4': case 'nav': switchTab('tab-perf'); logCliOutput("LOADED: NAV CHART"); break;
      case '5': case 'exp': switchTab('tab-exp'); logCliOutput("LOADED: EXPERIENCE"); break;
      case '6': case 'msg': switchTab('tab-contact'); logCliOutput("LOADED: CONTACT"); break;
      case '7': case 'l2': switchTab('tab-l2'); logCliOutput("LOADED: LIVE L2 ORDER BOOK"); break;
      case '8': case 'sim': switchTab('tab-sim'); logCliOutput("LOADED: BACKTEST SIMULATOR"); break;

      case 'clear': case 'cls':
        if (cliOutput) { cliOutput.innerHTML = ''; cliOutput.classList.remove('active'); }
        break;

      case 'linkedin':
        window.open(PORTFOLIO_DATA.profile.linkedin, '_blank');
        logCliOutput("OPENING LINKEDIN...");
        break;

      case 'sound':
        window.toggleSound();
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

  // Keyboard shortcut keys (F1-F8)
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'F1') { e.preventDefault(); switchTab('tab-bio'); }
    if (e.key === 'F2') { e.preventDefault(); switchTab('tab-strat'); }
    if (e.key === 'F3') { e.preventDefault(); switchTab('tab-skills'); }
    if (e.key === 'F4') { e.preventDefault(); switchTab('tab-perf'); }
    if (e.key === 'F5') { e.preventDefault(); switchTab('tab-exp'); }
    if (e.key === 'F6') { e.preventDefault(); switchTab('tab-contact'); }
    if (e.key === 'F7') { e.preventDefault(); switchTab('tab-l2'); }
    if (e.key === 'F8') { e.preventDefault(); switchTab('tab-sim'); }
  });

  window.sendTerminalMessage = function() {
    const name = document.getElementById('msgName').value;
    const body = document.getElementById('msgBody').value;
    const status = document.getElementById('msgStatus');

    if (name && body) {
      playBeep(1400, 0.1);
      if (status) status.innerHTML = `✅ MSG SENT TO NQ TRADER DESK. (Simulated broadcast)`;
      logCliOutput(`DISPATCH: Message sent from ${name}`);
      document.getElementById('msgName').value = '';
      document.getElementById('msgBody').value = '';
    }
  };

  window.addEventListener('resize', () => {
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab && activeTab.id === 'tab-perf') renderNavChart();
    if (activeTab && activeTab.id === 'tab-sim') runBacktestSimulator();
  });

  // Init sequence
  initProfile();
  renderTickerTrack();
  initLiveTickerWebsocket();
  initLiveL2OrderBook();
  initContent();
});
