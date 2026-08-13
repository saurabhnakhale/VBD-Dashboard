/**
 * WeatherManager.js - Live Environmental & Vector Risk Surveillance for Nagpur
 * Updates #live-temp, #live-timestamp, #live-humidity, #vector-risk-badge, and #live-rainfall.
 */

(function () {
  async function fetchNagpurWeather() {
    const nagpurLat = 21.1458;
    const nagpurLon = 79.0882;
    const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${nagpurLat}&longitude=${nagpurLon}&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata`;

    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      const current = data.current;

      const tempElem = document.getElementById('live-temp') || document.getElementById('vbd-temp');
      const humElem = document.getElementById('live-humidity') || document.getElementById('vbd-humidity');
      const rainElem = document.getElementById('live-rainfall') || document.getElementById('vbd-rainfall');

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

      const timeElem = document.getElementById('live-timestamp') || document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = `Live • Updated ${timeStr}`;

      const riskBadge = document.getElementById('vector-risk-badge') || document.getElementById('vbd-risk');
      if (riskBadge) {
        if (current.relative_humidity_2m >= 60 && current.temperature_2m >= 22 && current.temperature_2m <= 32) {
          riskBadge.textContent = '↑ High Vector Breeding Risk';
          riskBadge.className = 'status-badge badge-danger vbd-badge vbd-badge-danger';
        } else {
          riskBadge.textContent = '↑ Vector-Borne Risk Factor';
          riskBadge.className = 'status-badge badge-warning vbd-badge vbd-badge-warning';
        }
      }
    } catch (err) {
      console.error('Weather API fetch failed:', err);
      const timeElem = document.getElementById('live-timestamp') || document.getElementById('vbd-time');
      if (timeElem) timeElem.textContent = '● Offline';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fetchNagpurWeather();
    });
  } else {
    fetchNagpurWeather();
  }

  setInterval(fetchNagpurWeather, 300000);
})();
