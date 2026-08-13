(function () {
  // 1. Automatically Inject CSS Styles into <head>
  const style = document.createElement('style');
  style.textContent = `
    .vbd-weather-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
      width: 100%;
    }
    .vbd-weather-card {
      background: var(--bg-card, #11182e);
      border: 1px solid var(--border-card, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 14px 18px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .vbd-weather-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-card-hover, rgba(99, 102, 241, 0.3));
    }
    .vbd-weather-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-sub, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .vbd-weather-value {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-white, #ffffff);
      margin: 8px 0;
    }
    .vbd-weather-footer {
      display: flex;
      align-items: center;
    }
    .vbd-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      display: inline-block;
    }
    .vbd-badge-live { background-color: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .vbd-badge-warning { background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .vbd-badge-info { background-color: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .vbd-badge-danger { background-color: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
  `;
  document.head.appendChild(style);

  // 2. Build Weather KPI Cards HTML Structure
  const weatherSection = document.createElement('section');
  weatherSection.className = 'vbd-weather-grid weather-kpi-grid';
  weatherSection.id = 'vbd-weather-container';
  weatherSection.innerHTML = `
    <div class="vbd-weather-card weather-card">
      <div class="vbd-weather-header weather-card-header">
        <span>🌡️ Nagpur Temperature</span>
        <span title="Live ambient temperature for Nagpur">ⓘ</span>
      </div>
      <div class="weather-card-body">
        <div class="vbd-weather-value weather-value weather-card-value" id="vbd-temp">-- °C</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-live status-badge badge-live" id="vbd-time">● Live • Connecting...</span>
        </div>
      </div>
    </div>

    <div class="vbd-weather-card weather-card">
      <div class="vbd-weather-header weather-card-header">
        <span>💧 Relative Humidity</span>
        <span title="Relative humidity >60% accelerates vector breeding">ⓘ</span>
      </div>
      <div class="weather-card-body">
        <div class="vbd-weather-value weather-value weather-card-value" id="vbd-humidity">-- %</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-warning status-badge badge-warning" id="vbd-risk">↑ Vector-Borne Risk Factor</span>
        </div>
      </div>
    </div>

    <div class="vbd-weather-card weather-card">
      <div class="vbd-weather-header weather-card-header">
        <span>🌧️ Precipitation / Rainfall</span>
        <span title="3-hour cumulative precipitation">ⓘ</span>
      </div>
      <div class="weather-card-body">
        <div class="vbd-weather-value weather-value weather-card-value" id="vbd-rainfall">-- mm</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-info status-badge badge-info">↑ Waterlogging Index</span>
        </div>
      </div>
    </div>
  `;

  // 3. Inject Component into DOM (Above existing KPI cards)
  function attachToDashboard() {
    if (document.getElementById('vbd-weather-container')) return;

    let targetContainer = document.querySelector('.top-dashboard-container') || document.querySelector('.dashboard-top-wrapper') || document.querySelector('main');

    if (targetContainer) {
      targetContainer.insertBefore(weatherSection, targetContainer.firstChild);
    }
  }

  // 4. Fetch Live Data from Open-Meteo API
  async function fetchNagpurWeather() {
    const nagpurLat = 21.1458;
    const nagpurLon = 79.0882;
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${nagpurLat}&longitude=${nagpurLon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const current = data.current;

      // Update Card Values for both ID schemes
      const tempElem = document.getElementById('vbd-temp') || document.getElementById('live-temp');
      const humElem = document.getElementById('vbd-humidity') || document.getElementById('live-humidity');
      const rainElem = document.getElementById('vbd-rainfall') || document.getElementById('live-rainfall');

      if (tempElem) tempElem.textContent = `${current.temperature_2m} °C`;
      if (humElem) humElem.textContent = `${current.relative_humidity_2m} %`;
      if (rainElem) rainElem.textContent = `${current.precipitation} mm`;

      // Update Timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toLowerCase();

      const timeElem = document.getElementById('vbd-time') || document.getElementById('live-timestamp');
      if (timeElem) timeElem.textContent = `Live • Updated ${timeStr}`;

      // Epidemiological Risk Logic
      const riskBadge = document.getElementById('vbd-risk') || document.getElementById('vector-risk-badge');
      if (riskBadge) {
        if (current.relative_humidity_2m >= 60 && current.temperature_2m >= 22 && current.temperature_2m <= 32) {
          riskBadge.textContent = '↑ High Vector Breeding Risk';
          riskBadge.className = 'vbd-badge vbd-badge-danger status-badge badge-danger';
        } else {
          riskBadge.textContent = '↑ Vector-Borne Risk Factor';
          riskBadge.className = 'vbd-badge vbd-badge-warning status-badge badge-warning';
        }
      }
    } catch (err) {
      console.error('Weather API fetch failed:', err);
      const timeElem = document.getElementById('vbd-time') || document.getElementById('live-timestamp');
      if (timeElem) timeElem.textContent = '● Offline';
    }
  }

  // 5. Automatic Execution on Page Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachToDashboard();
      fetchNagpurWeather();
    });
  } else {
    attachToDashboard();
    fetchNagpurWeather();
  }

  // Auto-refresh every 5 minutes (300,000 ms)
  setInterval(fetchNagpurWeather, 300000);
})();
