/**
 * WeatherManager.js - Live Environmental & Vector Risk Surveillance for Nagpur
 * Uses fetchNagpurWeatherData() function provided by the user.
 */

async function fetchNagpurWeatherData() {
  // Nagpur Coordinates: Lat 21.1458, Lon 79.0882
  const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=21.1458&longitude=79.0882&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Asia%2FKolkata";

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error("API Network response error");
    
    const data = await response.json();
    const current = data.current;

    // 1. Update Temperature, Humidity, and Precipitation values (with fallback IDs)
    const tempElem = document.getElementById("temp-value") || document.getElementById("live-temp") || document.getElementById("vbd-temp");
    const humElem = document.getElementById("humidity-value") || document.getElementById("live-humidity") || document.getElementById("vbd-humidity");
    const rainElem = document.getElementById("rainfall-value") || document.getElementById("live-rainfall") || document.getElementById("vbd-rainfall");

    if (tempElem) tempElem.innerText = `${current.temperature_2m} °C`;
    if (humElem) humElem.innerText = `${current.relative_humidity_2m} %`;
    if (rainElem) rainElem.innerText = `${current.precipitation} mm`;

    // 2. Update Live Timestamp
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    const timeElem = document.getElementById("live-time") || document.getElementById("live-timestamp") || document.getElementById("vbd-time");
    if (timeElem) timeElem.innerText = `Live • Updated ${timeString}`;

    // 3. Dynamic Vector-Borne Risk Factor Logic
    const riskBadge = document.getElementById("risk-badge") || document.getElementById("vector-risk-badge") || document.getElementById("vbd-risk");
    if (riskBadge) {
      if (current.relative_humidity_2m >= 60 && current.temperature_2m >= 22 && current.temperature_2m <= 32) {
        riskBadge.innerText = "↑ High Vector Breeding Risk";
        riskBadge.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
        riskBadge.style.color = "#ef4444";
      } else {
        riskBadge.innerText = "↑ Vector-Borne Risk Factor";
        riskBadge.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
        riskBadge.style.color = "#f59e0b";
      }
    }

  } catch (error) {
    console.error("Failed to fetch weather data:", error);
    const timeElem = document.getElementById("live-time") || document.getElementById("live-timestamp") || document.getElementById("vbd-time");
    if (timeElem) timeElem.innerText = "Offline";
  }
}

// Execute on load and set auto-refresh interval every 5 minutes (300,000 ms)
document.addEventListener("DOMContentLoaded", () => {
  fetchNagpurWeatherData();
  setInterval(fetchNagpurWeatherData, 300000);
});

// Also trigger immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  fetchNagpurWeatherData();
}
