/**
 * BLOOMBERG TERMINAL CORE APPLICATION JS
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check if PORTFOLIO_DATA is loaded
  if (typeof PORTFOLIO_DATA === 'undefined') {
    console.error("PORTFOLIO_DATA not loaded");
    return;
  }

  // Audio Synth State
  let soundEnabled = false;
  let audioCtx = null;

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
    if (btn) {
      btn.innerText = soundEnabled ? '[AUDIO: ON]' : '[AUDIO: OFF]';
    }
    if (soundEnabled) playBeep(1200, 0.1);
  };

  window.toggleCrt = function() {
    const crt = document.getElementById('crtOverlay');
    if (crt) {
      crt.style.display = crt.style.display === 'none' ? 'block' : 'none';
    }
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

  // 2. Populate Profile Information
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

    // Quick Metrics
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

  // 3. Populate Ticker Bar
  let tickersData = [...PORTFOLIO_DATA.tickers];
  function initTickers() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    // Render twice for continuous loop
    const renderContent = () => {
      return tickersData.map(t => {
        let cls = 'ticker-neutral';
        if (t.dir === 'up') cls = 'ticker-up';
        if (t.dir === 'down') cls = 'ticker-down';
        const formattedPrice = typeof t.price === 'number' ? t.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : t.price;
        return `
          <div class="ticker-item">
            <span class="ticker-symbol">${t.symbol}</span>
            <span class="ticker-price">${formattedPrice}</span>
            <span class="${cls}">${t.change}</span>
          </div>
        `;
      }).join('');
    };

    track.innerHTML = renderContent() + renderContent();
  }

  // Simulate price ticks
  setInterval(() => {
    tickersData = tickersData.map(t => {
      if (typeof t.price === 'number' && t.symbol !== 'SHARPE' && t.symbol !== 'MAX-DD') {
        const delta = (Math.random() - 0.48) * (t.price * 0.003);
        const newPrice = Math.max(1, t.price + delta);
        const isUp = delta >= 0;
        return {
          ...t,
          price: newPrice,
          dir: isUp ? 'up' : 'down'
        };
      }
      return t;
    });
    initTickers();
  }, 2500);

  // 4. Populate Strategies
  function initStrategies() {
    const container = document.getElementById('strategyList');
    if (!container) return;

    container.innerHTML = PORTFOLIO_DATA.strategies.map(s => `
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

  // 5. Populate Skills
  function initSkills() {
    const sk = PORTFOLIO_DATA.skills;
    const populateTags = (elementId, list) => {
      const el = document.getElementById(elementId);
      if (el) el.innerHTML = list.map(item => `<span class="tag">${item}</span>`).join('');
    };

    populateTags('skillsLanguages', sk.languages);
    populateTags('skillsLibraries', sk.libraries);
    populateTags('skillsInfra', sk.infrastructure);
    populateTags('skillsPlatforms', sk.tradingPlatforms);
  }

  // 6. Populate Experience & Education
  function initTimeline() {
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

  // 7. Render NAV Equity Canvas Chart
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

    const data = PORTFOLIO_DATA.navData;
    if (!data || data.length === 0) return;

    // Find min and max values
    const allVals = data.flatMap(d => [d.nav, d.benchmark]);
    const minVal = Math.min(...allVals) * 0.95;
    const maxVal = Math.max(...allVals) * 1.05;

    const getX = (index) => padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
    const getY = (val) => height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom);

    // Draw Grid & Axes
    ctx.strokeStyle = '#1f1f1f';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const v = minVal + (i / gridSteps) * (maxVal - minVal);
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.font = '10px Consolas, monospace';
      ctx.fillText(v.toFixed(0), 10, y + 3);
    }

    // Benchmark Line (Cyan Dashed)
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
    ctx.setLineDash([]); // Reset dash

    // Strategy NAV Area Fill (Gradient Amber)
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

    // Strategy NAV Line (Solid Amber)
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

      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffb700';
      ctx.fill();

      // X-axis Date label
      ctx.fillStyle = '#999';
      ctx.font = '10px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.date, x, height - 15);
    });
  }

  // 8. Tab Navigation Logic
  function switchTab(tabId) {
    playBeep(900, 0.04);
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    if (tabId === 'tab-perf') {
      setTimeout(renderNavChart, 50);
    }
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 9. Command Line Parser (CLI Input)
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

    playBeep(1100, 0.05);

    logCliOutput(`EXEC: ${cmdRaw.toUpperCase()}`);

    switch (cmd) {
      case 'help':
      case '?':
      case 'h':
        logCliOutput("AVAILABLE COMMANDS:");
        logCliOutput("  1 or BIO       - View Quant Trader Bio & Summary");
        logCliOutput("  2 or STRAT     - View Trading Strategies & Alpha Models");
        logCliOutput("  3 or TECH      - View Tech Stack & Quant Infrastructure");
        logCliOutput("  4 or NAV       - View Interactive NAV Equity Curve");
        logCliOutput("  5 or EXP       - View Experience & Academic Timeline");
        logCliOutput("  6 or MSG       - Direct Contact & LinkedIn");
        logCliOutput("  CLEAR          - Clear terminal logs");
        logCliOutput("  LINKEDIN       - Open LinkedIn profile link");
        logCliOutput("  SOUND          - Toggle retro sound audio effects");
        break;

      case '1':
      case 'bio':
      case 'about':
        switchTab('tab-bio');
        logCliOutput("LOADED: 1<GO> BIO");
        break;

      case '2':
      case 'strat':
      case 'strategies':
        switchTab('tab-strat');
        logCliOutput("LOADED: 2<GO> STRATEGIES");
        break;

      case '3':
      case 'tech':
      case 'skills':
        switchTab('tab-skills');
        logCliOutput("LOADED: 3<GO> TECH STACK");
        break;

      case '4':
      case 'nav':
      case 'perf':
        switchTab('tab-perf');
        logCliOutput("LOADED: 4<GO> NAV EQUITY CURVE");
        break;

      case '5':
      case 'exp':
      case 'experience':
        switchTab('tab-exp');
        logCliOutput("LOADED: 5<GO> EXPERIENCE & EDUCATION");
        break;

      case '6':
      case 'msg':
      case 'contact':
        switchTab('tab-contact');
        logCliOutput("LOADED: 6<GO> CONTACT & LINKEDIN");
        break;

      case 'clear':
      case 'cls':
        if (cliOutput) {
          cliOutput.innerHTML = '';
          cliOutput.classList.remove('active');
        }
        break;

      case 'linkedin':
        window.open(PORTFOLIO_DATA.profile.linkedin, '_blank');
        logCliOutput("OPENING LINKEDIN...");
        break;

      case 'sound':
        window.toggleSound();
        break;

      default:
        logCliOutput(`UNKNOWN COMMAND: "${cmdRaw}". TYPE 'HELP' FOR COMMAND LIST.`, true);
        break;
    }

    if (cliInput) cliInput.value = '';
  }

  if (cliSubmit && cliInput) {
    cliSubmit.addEventListener('click', () => handleCommand(cliInput.value));
    cliInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCommand(cliInput.value);
    });
  }

  // Keyboard shortcut keys (F1-F6)
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }
    if (e.key === 'F1') { e.preventDefault(); switchTab('tab-bio'); }
    if (e.key === 'F2') { e.preventDefault(); switchTab('tab-strat'); }
    if (e.key === 'F3') { e.preventDefault(); switchTab('tab-skills'); }
    if (e.key === 'F4') { e.preventDefault(); switchTab('tab-perf'); }
    if (e.key === 'F5') { e.preventDefault(); switchTab('tab-exp'); }
    if (e.key === 'F6') { e.preventDefault(); switchTab('tab-contact'); }
  });

  // Terminal Send Message simulation function
  window.sendTerminalMessage = function() {
    const name = document.getElementById('msgName').value;
    const body = document.getElementById('msgBody').value;
    const status = document.getElementById('msgStatus');

    if (name && body) {
      playBeep(1400, 0.1);
      if (status) {
        status.innerHTML = `✅ MSG SENT TO NQ TRADER DESK. (Simulated broadcast)`;
      }
      logCliOutput(`DISPATCH: Message sent from ${name}`);
      document.getElementById('msgName').value = '';
      document.getElementById('msgBody').value = '';
    }
  };

  // Resize window handler for canvas
  window.addEventListener('resize', () => {
    const activeTab = document.querySelector('.tab-panel.active');
    if (activeTab && activeTab.id === 'tab-perf') {
      renderNavChart();
    }
  });

  // Init sequence
  initProfile();
  initTickers();
  initStrategies();
  initSkills();
  initTimeline();
});
