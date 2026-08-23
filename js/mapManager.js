/**
 * MapManager.js - Leaflet.js GIS Spatial Mapping Engine
 * Implements Image 2 Design System:
 * - Crisp Nagpur Municipal Corporation boundary outlines & ward polygons
 * - Centroid Ward Number Badges (e.g. 9, 26, 52, 29, 43, 34, 117, etc.)
 * - Light Positron Basemap (default) & Dark Matter basemap toggle
 * - Image 2 Disease Breakdown & Case Density Floating UI Controls
 * - Radial Heat Glow effect for high-burden outbreak zones
 */

const MapManager = {
  map: null,
  lightTileLayer: null,
  darkTileLayer: null,
  activeTileMode: 'light', // 'light' or 'dark'
  
  geoJsonGroup: null,
  heatGlowGroup: null,
  markersGroup: null,
  wardBadgesGroup: null,
  
  geoJsonData: null,
  currentPatients: [],

  init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    try {
      // Initialize map centered on Nagpur
      this.map = L.map('map-container', {
        center: [21.1458, 79.0882],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      // 1. Light Basemap Tile Layer (CartoDB Positron - Image 2 Default)
      this.lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });

      // 2. Dark Basemap Tile Layer (CartoDB Dark Matter)
      this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });

      // Set default tile layer to Light (Image 2 style)
      this.lightTileLayer.addTo(this.map);

      // Layer groups
      this.heatGlowGroup = L.layerGroup().addTo(this.map);
      this.geoJsonGroup = L.layerGroup().addTo(this.map);
      this.wardBadgesGroup = L.layerGroup().addTo(this.map);
      this.markersGroup = L.layerGroup().addTo(this.map);

      // Add Floating Overlay Cards (Disease Types & Case Density)
      this.addFloatingControls();
      
      // Bind Basemap Switcher
      this.bindTileSwitcher();

    } catch (err) {
      console.error('[MapManager] Error initializing Leaflet map:', err);
    }
  },

  bindTileSwitcher() {
    const btn = document.getElementById('btn-toggle-basemap');
    const label = document.getElementById('basemap-mode-text');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (this.activeTileMode === 'light') {
        this.map.removeLayer(this.lightTileLayer);
        this.darkTileLayer.addTo(this.map);
        this.activeTileMode = 'dark';
        if (label) label.textContent = 'Light Basemap';
      } else {
        this.map.removeLayer(this.darkTileLayer);
        this.lightTileLayer.addTo(this.map);
        this.activeTileMode = 'light';
        if (label) label.textContent = 'Dark Basemap';
      }
    });
  },

  extractPrabhagNumber(nameStr) {
    if (!nameStr) return null;
    const match = String(nameStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  },

  async render(patients, highRiskAreas) {
    this.init();
    if (!this.map) return;

    this.currentPatients = patients || [];

    this.heatGlowGroup.clearLayers();
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
            wardZoneLookup[`Prabhag No. ${pNum}`] = item.zone.trim();
          }
        }
      });
    }

    // 2. Calculate disease counts overall & per prabhag
    const totalDiseaseCounts = { Chikungunya: 0, Dengue: 0, Malaria: 0, JE: 0 };
    const prabhagCounts = {};

    for (let p = 1; p <= 38; p++) {
      prabhagCounts[p] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0, Total: 0 };
    }

    if (Array.isArray(patients)) {
      patients.forEach(patient => {
        let pNum = patient.prabhagNum || this.extractPrabhagNumber(patient.prabhag);
        if (!pNum && patient.prabhag) pNum = parseInt(patient.prabhag, 10);

        const dStr = (patient.disease || '').toLowerCase();
        let diseaseCat = 'Dengue';

        if (dStr.includes('chikun')) {
          diseaseCat = 'Chikungunya';
          totalDiseaseCounts.Chikungunya++;
        } else if (dStr.includes('malaria')) {
          diseaseCat = 'Malaria';
          totalDiseaseCounts.Malaria++;
        } else if (dStr.includes('je') || dStr.includes('encephalitis') || dStr.includes('scrub') || dStr.includes('typhus')) {
          diseaseCat = 'JE';
          totalDiseaseCounts.JE++;
        } else {
          diseaseCat = 'Dengue';
          totalDiseaseCounts.Dengue++;
        }

        if (pNum && prabhagCounts[pNum]) {
          prabhagCounts[pNum][diseaseCat]++;
          prabhagCounts[pNum].Total++;
        }
      });
    }

    // Update Floating Disease Stats Card
    this.updateDiseaseStatsCard(totalDiseaseCounts);

    // 3. Load bundled GeoJSON features (WARDS_GEOJSON)
    let geoData = (typeof WARDS_GEOJSON !== 'undefined' && WARDS_GEOJSON) ? WARDS_GEOJSON : this.geoJsonData;

    if (geoData) {
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const rawName = (feature.properties?.name || '').trim();
          const pNum = this.extractPrabhagNumber(rawName);
          const count = pNum && prabhagCounts[pNum] ? prabhagCounts[pNum].Total : 0;

          // Image 2 Case Density Color Palette:
          // Critical/High (>15): Red #dc2626
          // Moderate-High (9-15): Orange #ea580c
          // Moderate (4-8): Yellow-Orange #f59e0b
          // Low Cases (1-3): Soft Yellow #fde047
          // Zero Cases (0): Soft Light Green #dcfce7
          let fillColor = '#dcfce7'; // Zero Cases default
          let fillOpacity = 0.85;

          if (count > 15) {
            fillColor = '#dc2626'; // Critical / High
          } else if (count >= 9) {
            fillColor = '#ea580c'; // Moderate-High
          } else if (count >= 4) {
            fillColor = '#f59e0b'; // Moderate
          } else if (count >= 1) {
            fillColor = '#fde047'; // Low Cases
          } else {
            fillColor = '#dcfce7'; // Zero Cases
          }

          return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            color: '#1d4ed8', // Crisp blue boundary stroke (Image 2 style)
            weight: 2.2,
            opacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const rawName = (feature.properties?.name || 'Ward').trim();
          const pNum = this.extractPrabhagNumber(rawName);
          const mappedZone = (pNum && wardZoneLookup[pNum]) ? wardZoneLookup[pNum] : (wardZoneLookup[rawName] || 'Municipal Zone');

          const pData = (pNum && prabhagCounts[pNum])
            ? prabhagCounts[pNum]
            : { Total: 0, Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0 };

          // A. Calculate Polygon Centroid & Plot Ward Number Badge (Image 2 Exact Feature)
          try {
            const centroid = layer.getBounds().getCenter();
            if (pNum && centroid) {
              
              // If ward has high outbreak count, add red radial heat glow under centroid
              if (pData.Total >= 15) {
                const glowCircle = L.circle(centroid, {
                  radius: 1200,
                  color: 'transparent',
                  fillColor: '#dc2626',
                  fillOpacity: 0.45,
                  className: 'outbreak-heat-glow'
                });
                this.heatGlowGroup.addLayer(glowCircle);
              } else if (pData.Total >= 8) {
                const glowCircle = L.circle(centroid, {
                  radius: 800,
                  color: 'transparent',
                  fillColor: '#ea580c',
                  fillOpacity: 0.35
                });
                this.heatGlowGroup.addLayer(glowCircle);
              }

              // Image 2 Centroid Ward Badge Icon
              const wardBadgeIcon = L.divIcon({
                className: 'ward-centroid-badge-wrapper',
                html: `<div class="ward-centroid-badge ${pData.Total > 15 ? 'badge-critical' : (pData.Total > 0 ? 'badge-cases' : 'badge-zero')}">${pNum}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
              });

              const badgeMarker = L.marker(centroid, { icon: wardBadgeIcon, interactive: false });
              this.wardBadgesGroup.addLayer(badgeMarker);
            }
          } catch (err) {
            console.warn('[MapManager] Error placing ward badge:', err);
          }

          // B. Interactive Popup
          layer.bindPopup(`
            <div style="color: #0f172a; padding: 6px; min-width: 220px; font-family: sans-serif;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: #1d4ed8; font-size: 14px;">🏛️ Prabhag No. ${pNum || rawName}</strong>
                <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 800;">P-${pNum || '?'}</span>
              </div>
              <div style="color: #475569; font-size: 12px; margin-bottom: 6px;">
                <b>Zone:</b> ${mappedZone}
              </div>
              
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; display: flex; justify-content: space-between;">
                  <span>Active Patient Cases:</span>
                  <span style="color: #dc2626; font-size: 15px;">${pData.Total}</span>
                </div>
              </div>

              <div style="font-size: 11px; color: #334155; line-height: 1.6;">
                <div style="display: flex; justify-content: space-between;"><span>• 🦟 Dengue:</span> <b>${pData.Dengue}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🦠 Chikungunya:</span> <b>${pData.Chikungunya}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🔬 Malaria:</span> <b>${pData.Malaria}</b></div>
                <div style="display: flex; justify-content: space-between;"><span>• 🐛 JE / Scrub Typhus:</span> <b>${pData.JE}</b></div>
              </div>
            </div>
          `);

          // Hover highlight
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({ weight: 4, color: '#000000', fillOpacity: 0.95 });
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

      // Fit Map to NMC Wards Bounds
      try {
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [15, 15] });
        }
      } catch (e) {
        console.warn('fitBounds warning:', e);
      }
    }

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 100);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 300);
  },

  addFloatingControls() {
    // 1. Floating Card: Disease Types (Image 2 Bottom-Left)
    const diseaseControl = L.control({ position: 'bottomleft' });
    diseaseControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-floating-card map-disease-card');
      div.style.background = '#ffffff';
      div.style.padding = '10px 14px';
      div.style.borderRadius = '12px';
      div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      div.style.border = '1px solid #e2e8f0';
      div.style.marginBottom = '12px';
      div.style.minWidth = '160px';
      div.style.fontFamily = 'sans-serif';

      div.innerHTML = `
        <div style="font-size: 0.78rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span style="color: #10b981;">🌿</span> Disease Types
        </div>
        <div style="font-size: 0.75rem; color: #334155; line-height: 1.7;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#2563eb; margin-right:6px;"></span>Chikungunya</span>
            <b id="map-stat-chikun" style="color:#1e293b; margin-left:12px;">--</b>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#ea580c; margin-right:6px;"></span>Dengue</span>
            <b id="map-stat-dengue" style="color:#1e293b; margin-left:12px;">--</b>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#1e1b4b; margin-right:6px;"></span>Malaria</span>
            <b id="map-stat-malaria" style="color:#1e293b; margin-left:12px;">--</b>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#a855f7; margin-right:6px;"></span>JE</span>
            <b id="map-stat-je" style="color:#1e293b; margin-left:12px;">--</b>
          </div>
        </div>
      `;
      return div;
    };
    diseaseControl.addTo(this.map);

    // 2. Floating Card: Case Density Legend (Image 2 Bottom-Left)
    const densityControl = L.control({ position: 'bottomleft' });
    densityControl.onAdd = function () {
      const div = L.DomUtil.create('div', 'map-floating-card map-density-card');
      div.style.background = '#ffffff';
      div.style.padding = '10px 14px';
      div.style.borderRadius = '12px';
      div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
      div.style.border = '1px solid #e2e8f0';
      div.style.marginBottom = '12px';
      div.style.minWidth = '160px';
      div.style.fontFamily = 'sans-serif';

      div.innerHTML = `
        <div style="font-size: 0.78rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span style="color: #2563eb;">📊</span> Case Density
        </div>
        <div style="font-size: 0.75rem; color: #334155; line-height: 1.7;">
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#dc2626; border-radius:2px;"></div> Critical / High</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#ea580c; border-radius:2px;"></div> Moderate-High</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#f59e0b; border-radius:2px;"></div> Moderate</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#fde047; border-radius:2px; border:1px solid #cbd5e1;"></div> Low Cases</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#dcfce7; border-radius:2px; border:1px solid #cbd5e1;"></div> Zero Cases</div>
        </div>
      `;
      return div;
    };
    densityControl.addTo(this.map);
  },

  updateDiseaseStatsCard(counts) {
    const elChikun = document.getElementById('map-stat-chikun');
    const elDengue = document.getElementById('map-stat-dengue');
    const elMalaria = document.getElementById('map-stat-malaria');
    const elJE = document.getElementById('map-stat-je');

    if (elChikun) elChikun.textContent = counts.Chikungunya || 0;
    if (elDengue) elDengue.textContent = counts.Dengue || 0;
    if (elMalaria) elMalaria.textContent = counts.Malaria || 0;
    if (elJE) elJE.textContent = counts.JE || 0;
  }
};
