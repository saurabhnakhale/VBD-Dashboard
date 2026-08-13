/**
 * WeatherManager.js - Live Environmental & Vector Risk Surveillance for Nagpur
 * Displays Nagpur Temperature, Relative Humidity, and Precipitation / Rainfall.
 * Centers all text & places numerical value + status badge side-by-side in a single row.
 */

(function () {
  function attachToDashboard() {
    if (document.getElementById('vbd-weather-container')) return;

    // Target top wrapper or slot
    let topWrapper = document.querySelector('.dashboard-top-wrapper');
    if (!topWrapper) {
      topWrapper = document.querySelector('main');
    }
    if (!topWrapper) return;

    const weatherSection = document.createElement('section');
    weatherSection.className = 'weather-kpi-grid vbd-weather-grid';
    weatherSection.id = 'vbd-weather-container';
    weatherSection.innerHTML = `
      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>🌡️ Nagpur Temperature</span>
          <span title="Live ambient temperature for Nagpur Municipal Area">ⓘ</span>
        </div>
        <div class="weather-card-body">
          <div class="weather-card-value vbd-weather-value" id="vbd-temp">-- °C</div>
          <div class="vbd-weather-footer">
            <span class="status-badge vbd-badge vbd-badge-live" id="vbd-time">● Live • Connecting...</span>
          </div>
        </div>
      </div>

      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>💧 Relative Humidity</span>
          <span title="Relative humidity >60% accelerates vector breeding">ⓘ</span>
        </div>
        <div class="weather-card-body">
          <div class="weather-card-value vbd-weather-value" id="vbd-humidity">-- %</div>
          <div class="vbd-weather-footer">
            <span class="status-badge vbd-badge vbd-badge-warning" id="vbd-risk">↑ Vector-Borne Risk Factor</span>
          </div>
        </div>
      </div>

      <div class="weather-card vbd-weather-card">
        <div class="vbd-weather-header">
          <span>🌧️ Precipitation / Rainfall</span>
          <span title="Current precipitation index">ⓘ</span>
        </div>
        <div class="weather-card-body">
          <div class="weather-card-value vbd-weather-value" id="vbd-rainfall">-- mm</div>
          <div class="vbd-weather-footer">
            <span class="status-badge vbd-badge vbd-badge-info">↑ Waterlogging Index</span>
          </div>
        </div>
      </div>
    `;

    // Ensure Weather is ALWAYS the FIRST element in top wrapper (above Filter Bar)
    topWrapper.insertBefore(weatherSection, topWrapper.firstChild);
  }

  async function fetchNagpurWeather() {
    const nagpurLat = 21.1458;
    const nagpurLon = 79.0882;
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${nagpurLat}&longitude=${nagpurLon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const current = data.current;

      const tempElem = document.getElementById('vbd-temp');
      const humElem = document.getElementById('vbd-humidity');
      const rainElem = document.getElementById('vbd-rainfall');

      if (tempElem) tempElem.textContent = `${current.temperature_2m} °C`;
      if (humElem) humElem.textContent = `${current.relative_humidity_2m} %`;
      if (rainElem) rainElem.textContent = `${current.precipitation} mm`;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).toLowerCase();

      const timeElem = document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = `Live • Updated ${timeStr}`;

      const riskBadge = document.getElementById('vbd-risk');
      if (riskBadge) {
        if (current.relative_humidity_2m >= 60 && current.temperature_2m >= 22 && current.temperature_2m <= 32) {
          riskBadge.textContent = '↑ High Vector Breeding Risk';
          riskBadge.className = 'status-badge vbd-badge vbd-badge-danger';
        } else {
          riskBadge.textContent = '↑ Vector-Borne Risk Factor';
          riskBadge.className = 'status-badge vbd-badge vbd-badge-warning';
        }
      }
    } catch (err) {
      console.error('Weather API fetch failed:', err);
      const timeElem = document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = '● Offline';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachToDashboard();
      fetchNagpurWeather();
    });
  } else {
    attachToDashboard();
    fetchNagpurWeather();
  }

  setInterval(fetchNagpurWeather, 300000);
})();
