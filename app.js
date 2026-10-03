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

          // Asks
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

          // Bids
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
          const ofiVal = ((totalBidVol - totalAskVol) / totalVol).toFixed(2);

          if (l2Ofi) l2Ofi.innerText = `OFI: ${ofiVal >= 0 ? '+' : ''}${ofiVal}`;
          
          const bidBar = document.getElementById('bidBarRatio');
          const askBar = document.getElementById('askBarRatio');
          const bidText = document.getElementById('bidPercentText');
          const askText = document.getElementById('askPercentText');

          if (bidBar) bidBar.style.width = `${bidRatio.toFixed(1)}%`;
          if (askBar) askBar.style.width = `${(100 - bidRatio).toFixed(1)}%`;
          if (bidText) bidText.innerText = `BIDS: ${bidRatio.toFixed(1)}%`;
          if (askText) askText.innerText = `ASKS: ${(100 - bidRatio).toFixed(1)}%`;
        }
      };
    } catch (e) {
      console.warn("L2 depth ws error", e);
    }
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
});
