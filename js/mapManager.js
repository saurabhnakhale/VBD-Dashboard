/**
 * MapManager.js - Leaflet.js GIS Spatial Mapping Engine
 * Integrated with 38 Ward GeoJSON boundaries (WARDS_GEOJSON), Ward-to-Zone Mapping (WARD_ZONE_MAPPING),
 * choropleth polygons with case heat density, centroid label badges, and healthcare nodes.
 * Designed to fit seamlessly into the dark theme dashboard aesthetic.
 */

// Coordinates for Nagpur Localities & Landmarks
const LOCALITY_COORDS = {
  "Borgaon": [21.1850, 79.0550],
  "Bhupesh Nagar": [21.1880, 79.0520],
  "Gorewada": [21.1950, 79.0480],
  "Zingabai Takli": [21.1920, 79.0700],
  "Gittikhadan": [21.1750, 79.0510],
  "Jaripatka": [21.1860, 79.0900],
  "Patel Nagar": [21.1830, 79.0560],
  "Katol Road": [21.1700, 79.0600],
  "Seminary Hills": [21.1620, 79.0550],
  "Friends Colony": [21.1780, 79.0490],
  "Deepak Nagar": [21.1760, 79.0540],
  "Dharampeth": [21.1440, 79.0660],
  "Shankar Nagar": [21.1380, 79.0680],
  "Futala": [21.1540, 79.0480],
  "Laxmi Nagar": [21.1210, 79.0650],
  "Chatrapati Nagar": [21.1120, 79.0680],
  "Pratap Nagar": [21.1180, 79.0550],
  "Sonegaon": [21.0920, 79.0540],
  "Hanuman Nagar": [21.1250, 79.0950],
  "Manewada": [21.1020, 79.1020],
  "Hudkeshwar": [21.0900, 79.1150],
  "Dhantoli": [21.1350, 79.0820],
  "Ajni": [21.1200, 79.0880],
  "Manish Nagar": [21.0980, 79.0780],
  "Nandanvan": [21.1360, 79.1200],
  "Wathoda": [21.1420, 79.1380],
  "Mahal": [21.1450, 79.1020],
  "Mominpura": [21.1560, 79.0950],
  "Satranjipura": [21.1680, 79.1050],
  "Itwari": [21.1580, 79.1100],
  "Lakadganj": [21.1520, 79.1250],
  "Pardi": [21.1600, 79.1450],
  "Nari": [21.2010, 79.0950],
  "Vaishali Nagar": [21.1850, 79.1150]
};

// Hospital Locations
const HOSPITAL_COORDS = {
  "IGMC": [21.1540, 79.0880],
  "KT Nagar UPHC": [21.1730, 79.0530],
  "Hajaripahad UPHC": [21.1680, 79.0430],
  "KIMS Kingsway Hospital": [21.1510, 79.0860],
  "WOCKHARDT HOSPITAL": [21.1340, 79.0750],
  "VIVEKA HOSPITAL": [21.1150, 79.0620],
  "AYUSH UPHC": [21.1420, 79.0720],
  "Zingabai Takli UPHC": [21.1910, 79.0720],
  "Gorewada UPHC": [21.1960, 79.0510],
  "INDORA UPHC": [21.1780, 79.0890]
};

const MapManager = {
  map: null,
  markersGroup: null,
  highRiskGroup: null,
  geoJsonGroup: null,
  wardBadgesGroup: null,
  geoJsonData: null,
  hasFittedBounds: false,

  init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    try {
      // Center on Nagpur
      this.map = L.map('map-container', {
        center: [21.1458, 79.0882],
        zoom: 12,
        zoomControl: true
      });

      // Primary Dark Tile Layer: Esri World Dark Gray Canvas (100% Free, No API Key Required)
      const darkLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, HERE, Garmin, FAO, NOAA, USGS, NGA, EPA, USDA, NPS',
        maxZoom: 19
      });

      // Fallback Tile Layer: OpenStreetMap Standard (100% Free, No API Key Required)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      });

      darkLayer.on('tileerror', () => {
        console.warn('[MapManager] Primary tiles failed, switching to OpenStreetMap fallback.');
        if (this.map.hasLayer(darkLayer)) {
          this.map.removeLayer(darkLayer);
          osmLayer.addTo(this.map);
        }
      });

      darkLayer.addTo(this.map);

      this.highRiskGroup = L.layerGroup().addTo(this.map);
      this.geoJsonGroup = L.layerGroup().addTo(this.map);
      this.wardBadgesGroup = L.layerGroup().addTo(this.map);
      this.markersGroup = L.layerGroup().addTo(this.map);

      this.addMapLegend();
    } catch (err) {
      console.error('[MapManager] Error initializing Leaflet map:', err);
    }
  },

  extractPrabhagNumber(nameStr) {
    if (!nameStr) return null;
    const match = String(nameStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  },

  async render(patients, highRiskAreas) {
    this.init();
    if (!this.map) return;

    this.highRiskGroup.clearLayers();
    this.geoJsonGroup.clearLayers();
    this.wardBadgesGroup.clearLayers();
    this.markersGroup.clearLayers();

    // 1. Build lookup dictionary from WARD_ZONE_MAPPING
    const wardZoneLookup = {};
    if (typeof WARD_ZONE_MAPPING !== 'undefined' && Array.isArray(WARD_ZONE_MAPPING)) {
      WARD_ZONE_MAPPING.forEach(item => {
        if (item.ward && item.zone) {
          const wTrim = item.ward.trim();
          const pNum = this.extractPrabhagNumber(wTrim);
          if (pNum) {
            wardZoneLookup[pNum] = item.zone.trim();
            wardZoneLookup[wTrim] = item.zone.trim();
            wardZoneLookup[`Prabhag ${pNum}`] = item.zone.trim();
            wardZoneLookup[`P${pNum}`] = item.zone.trim();
          }
        }
      });
    }

    // 2. Calculate per-prabhag case breakdown
    const prabhagCounts = {};
    for (let p = 1; p <= 38; p++) {
      prabhagCounts[p] = { Dengue: 0, Chikungunya: 0, Malaria: 0, ScrubTyphus: 0, Total: 0 };
    }

    if (Array.isArray(patients)) {
      patients.forEach(patient => {
        let pNum = patient.prabhagNum || this.extractPrabhagNumber(patient.prabhag);
        if (!pNum && patient.prabhag) pNum = parseInt(patient.prabhag, 10);

        if (pNum && prabhagCounts[pNum]) {
          const dStr = (patient.disease || '').toLowerCase();
          if (dStr.includes('chikun')) prabhagCounts[pNum].Chikungunya++;
          else if (dStr.includes('malaria')) prabhagCounts[pNum].Malaria++;
          else if (dStr.includes('japanese') || dStr.includes('encephalitis') || dStr.includes('je') || dStr.includes('scrub') || dStr.includes('typhus')) prabhagCounts[pNum].ScrubTyphus++;
          else prabhagCounts[pNum].Dengue++;

          prabhagCounts[pNum].Total++;
        }
      });
    }

    // 3. Load bundled GeoJSON features (WARDS_GEOJSON)
    let geoData = (typeof WARDS_GEOJSON !== 'undefined' && WARDS_GEOJSON) ? WARDS_GEOJSON : this.geoJsonData;

    if (geoData) {
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const rawName = feature.properties?.name || '';
          const pNum = this.extractPrabhagNumber(rawName);
          const count = pNum && prabhagCounts[pNum] ? prabhagCounts[pNum].Total : 0;

          let fillColor = '#6366f1';
          let strokeColor = '#38bdf8';
          let weight = 1.8;
          let fillOpacity = 0.35;

          if (count > 15) {
            fillColor = '#ef4444';
            strokeColor = '#f43f5e';
            weight = 2.5;
            fillOpacity = 0.75;
          } else if (count > 8) {
            fillColor = '#ec4899';
            strokeColor = '#f472b6';
            weight = 2.2;
            fillOpacity = 0.65;
          } else if (count > 3) {
            fillColor = '#f59e0b';
            strokeColor = '#fbbf24';
            weight = 2.0;
            fillOpacity = 0.55;
          } else if (count > 0) {
            fillColor = '#06b6d4';
            strokeColor = '#22d3ee';
            weight = 1.8;
            fillOpacity = 0.45;
          }

          return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            color: strokeColor,
            weight: weight,
            opacity: 0.95
          };
        },
        onEachFeature: (feature, layer) => {
          const rawName = (feature.properties?.name || 'Ward').trim();
          const pNum = this.extractPrabhagNumber(rawName);
          const mappedZone = (pNum && wardZoneLookup[pNum]) ? wardZoneLookup[pNum] : (wardZoneLookup[rawName] || 'Municipal Zone');

          const pData = (pNum && prabhagCounts[pNum])
            ? prabhagCounts[pNum]
            : { Total: 0, Dengue: 0, Chikungunya: 0, Malaria: 0, ScrubTyphus: 0 };

          // Centroid badge label
          try {
            const centroid = layer.getBounds().getCenter();
            if (pNum && centroid) {
              const badgeClass = pData.Total > 0 ? 'ward-label-badge has-cases' : 'ward-label-badge';
              const labelHtml = `<div class="${badgeClass}">P-${pNum}: ${pData.Total}</div>`;
              
              const badgeIcon = L.divIcon({
                className: 'custom-ward-badge-marker',
                html: labelHtml,
                iconSize: [60, 20],
                iconAnchor: [30, 10]
              });

              const badgeMarker = L.marker(centroid, { icon: badgeIcon, interactive: false });
              this.wardBadgesGroup.addLayer(badgeMarker);
            }
          } catch (e) {
            console.warn('Centroid badge warning:', e);
          }

          layer.bindPopup(`
            <div style="color: #0f172a; padding: 6px; min-width: 220px; font-family: sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #4f46e5; font-size: 14px;">🏛️ Prabhag No. ${pNum || rawName}</strong>
                <span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">P-${pNum || '?'}</span>
              </div>
              <div style="color: #475569; font-size: 12px; margin-bottom: 6px;">
                <b>Zone:</b> ${mappedZone}
              </div>
              
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; display: flex; justify-content: space-between;">
                  <span>Active Patient Burden:</span>
                  <span style="color: #dc2626; font-size: 14px;">${pData.Total} cases</span>
                </div>
              </div>

              <div style="font-size: 11px; color: #334155; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between;"><span>• 🦟 Dengue:</span> <b>${pData.Dengue}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🦠 Chikungunya:</span> <b>${pData.Chikungunya}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🔬 Malaria:</span> <b>${pData.Malaria}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🐛 Scrub Typhus / JE:</span> <b>${pData.ScrubTyphus}</b></div>
              </div>
            </div>
          `);

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({ weight: 3.5, color: '#ffffff', fillOpacity: 0.85 });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                l.bringToFront();
              }
            },
            mouseout: (e) => {
              geoJsonLayer.resetStyle(e.target);
            }
          });
        }
      });

      this.geoJsonGroup.addLayer(geoJsonLayer);

      try {
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (e) {
        console.warn('fitBounds warning:', e);
      }
    }

    // 4. Plot Hospitals & Healthcare Facilities
    Object.entries(HOSPITAL_COORDS).forEach(([hospName, coords]) => {
      const hospIcon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `<div style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker(coords, { icon: hospIcon });
      marker.bindPopup(`
        <div style="color: #0f172a; padding: 4px;">
          <strong style="color: #10b981; font-size: 13px;">🏥 ${hospName}</strong><br/>
          <span style="font-size: 11px; color: #64748b;">Healthcare Notification Facility</span>
        </div>
      `);
      this.markersGroup.addLayer(marker);
    });

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 100);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 400);
  },

  addMapLegend() {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-legend-box');
      div.innerHTML = `
        <strong style="display:block; margin-bottom: 6px;">GIS Spatial Legend</strong>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #ef4444;"></div> High Outbreak Ward (>15 cases)</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #ec4899;"></div> Moderate Outbreak Ward (9-15 cases)</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #f59e0b;"></div> Emerging Outbreak Ward (4-8 cases)</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #06b6d4;"></div> Low Case Ward (1-3 cases)</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #6366f1;"></div> Baseline Ward (0 cases)</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #10b981;"></div> Hospital / UPHC Node</div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }
};
