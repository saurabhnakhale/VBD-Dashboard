/**
 * WeatherManager.js - Live Environmental & Vector Risk Surveillance for Nagpur
 * Fetches real-time ambient temperature, humidity, and rainfall from Open-Meteo API.
 */

(function () {
  // 1. Inject Live Weather Grid HTML above existing KPI cards
  function attachToDashboard() {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    // Avoid duplicate injection
    if (document.getElementById('vbd-weather-container')) return;

    const weatherSection = document.createElement('section');
    weatherSection.className = 'weather-kpi-grid vbd-weather-grid';
    weatherSection.id = 'vbd-weather-container';
    weatherSection.innerHTML = `
      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>🌡️ Nagpur Temperature</span>
          <span title="Live ambient temperature for Nagpur Municipal Area">ⓘ</span>
        </div>
        <div class="weather-card-value vbd-weather-value" id="vbd-temp">-- °C</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-live" id="vbd-time">● Live • Connecting...</span>
        </div>
      </div>

      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>💧 Relative Humidity</span>
          <span title="Relative humidity >60% accelerates vector breeding">ⓘ</span>
        </div>
        <div class="weather-card-value vbd-weather-value" id="vbd-humidity">-- %</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-warning" id="vbd-risk">↑ Vector-Borne Risk Factor</span>
        </div>
      </div>

      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>🌧️ Precipitation / Rainfall</span>
          <span title="Current precipitation index">ⓘ</span>
        </div>
        <div class="weather-card-value vbd-weather-value" id="vbd-rainfall">-- mm</div>
        <div class="vbd-weather-footer">
          <span class="vbd-badge vbd-badge-info">↑ Waterlogging Index</span>
        </div>
      </div>
    `;

    mainElement.insertBefore(weatherSection, mainElement.firstChild);
  }

  // 2. Fetch Live Weather Data from Open-Meteo API
  async function fetchNagpurWeather() {
    const nagpurLat = 21.1458;
    const nagpurLon = 79.0882;
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${nagpurLat}&longitude=${nagpurLon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const current = data.current;

      // Update Card Values
      const tempElem = document.getElementById('vbd-temp');
      const humElem = document.getElementById('vbd-humidity');
      const rainElem = document.getElementById('vbd-rainfall');

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

      const timeElem = document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = `Live • Updated ${timeStr}`;

      // Epidemiological Risk Logic
      const riskBadge = document.getElementById('vbd-risk');
      if (riskBadge) {
        if (current.relative_humidity_2m >= 60 && current.temperature_2m >= 22 && current.temperature_2m <= 32) {
          riskBadge.textContent = '↑ High Vector Breeding Risk';
          riskBadge.className = 'vbd-badge vbd-badge-danger';
        } else {
          riskBadge.textContent = '↑ Vector-Borne Risk Factor';
          riskBadge.className = 'vbd-badge vbd-badge-warning';
        }
      }
    } catch (err) {
      console.error('Weather API fetch failed:', err);
      const timeElem = document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = '● Offline';
    }
  }

  // 3. Execution Setup
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
