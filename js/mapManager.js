/**
 * MapManager.js - Clean GIS Spatial Ward Choropleth Mapping Engine
 * 1. 38 Ward GeoJSON choropleth polygons with density heat fill & crisp blue borders
 * 2. Centroid circular ward badges (P-1 to P-38)
 * 3. Layer selector box (Default OSM, Clean Gray, Satellite, Topographic)
 * 4. Target re-centering button (🎯) & Zoom +/- controls
 * 5. Floating Disease Types & Case Density panels
 */

// Hospital Locations (Healthcare Facilities)
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
  geoJsonGroup: null,
  wardBadgesGroup: null,
  markersGroup: null,
  
  // Layer Base Maps (100% Free, NO API KEY)
  baseLayers: {},
  activeBaseLayer: null,

  currentPatients: [],
  geoDataBounds: null,

  init() {
    const container = document.getElementById('map-container');
    if (!container) return;

    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    try {
      // 1. Initialize Map centered on Nagpur
      this.map = L.map('map-container', {
        center: [21.1458, 79.0882],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // 2. Base Layers Definition (100% Free, No API Key Watermarks)
      this.baseLayers = {
        'Default Map (OSM)': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }),
        'Clean Gray Map (Free)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: '&copy; Esri, HERE, Garmin'
        }),
        'Satellite View (Free)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        }),
        'Topographic Map (Free)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: '&copy; Esri, HERE, Garmin, Intermap'
        })
      };

      // Set default base layer to OSM
      this.activeBaseLayer = this.baseLayers['Default Map (OSM)'];
      this.activeBaseLayer.addTo(this.map);

      // 3. Initialize Feature Groups
      this.geoJsonGroup = L.layerGroup().addTo(this.map);
      this.wardBadgesGroup = L.layerGroup().addTo(this.map);
      this.markersGroup = L.layerGroup().addTo(this.map);

      // 4. Add Top-Right Controls (Layer Selector Box + Centering Target + Zoom +/-)
      this.addTopRightControls();

      // 5. Add Bottom-Left Floating Cards (Disease Types & Case Density)
      this.addFloatingCards();

    } catch (err) {
      console.error('[MapManager] Error initializing Leaflet map:', err);
    }
  },

  addTopRightControls() {
    // A. Leaflet Expandable Layer Control Box (Top Right)
    const layerControl = L.control.layers(this.baseLayers, null, {
      position: 'topright',
      collapsed: true
    });
    layerControl.addTo(this.map);

    setTimeout(() => {
      const container = layerControl.getContainer();
      if (container) {
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
        container.style.borderRadius = '8px';
        container.style.border = '1px solid #cbd5e1';
      }
    }, 100);

    // B. Custom Map Control Bar (Target / Re-center + Zoom +/- Stacked Vertically)
    const customControl = L.control({ position: 'topright' });
    customControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-custom-right-stack');
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '6px';
      div.style.marginTop = '10px';

      div.innerHTML = `
        <!-- Map Centering Target Icon Button (Target Crosshair) -->
        <button id="btn-recenter-map" title="Re-center & Fit Map to Nagpur Boundaries" style="width: 32px; height: 32px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #dc2626; box-shadow: 0 2px 8px rgba(0,0,0,0.12); font-size: 14px; transition: all 0.2s ease;">
          <i class="fa-solid fa-bullseye"></i>
        </button>

        <!-- Zoom In Button -->
        <button id="btn-zoom-in" title="Zoom In" style="width: 32px; height: 32px; background: #ffffff; border: 1px solid #cbd5e1; border-top-left-radius: 6px; border-top-right-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1e293b; font-weight: bold; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          +
        </button>
        <!-- Zoom Out Button -->
        <button id="btn-zoom-out" title="Zoom Out" style="width: 32px; height: 32px; background: #ffffff; border: 1px solid #cbd5e1; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; margin-top: -6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1e293b; font-weight: bold; font-size: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          −
        </button>
      `;

      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    customControl.addTo(this.map);

    // Bind Centering & Zoom Button Click Handlers
    setTimeout(() => {
      const btnCenter = document.getElementById('btn-recenter-map');
      const btnZoomIn = document.getElementById('btn-zoom-in');
      const btnZoomOut = document.getElementById('btn-zoom-out');

      if (btnCenter) {
        btnCenter.addEventListener('click', () => {
          this.recenterMap();
        });
      }
      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
          if (this.map) this.map.zoomIn();
        });
      }
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
          if (this.map) this.map.zoomOut();
        });
      }
    }, 200);
  },

  recenterMap() {
    if (!this.map) return;
    if (this.geoDataBounds && this.geoDataBounds.isValid()) {
      this.map.fitBounds(this.geoDataBounds, { padding: [25, 25] });
    } else {
      this.map.setView([21.1458, 79.0882], 12);
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

    this.currentPatients = patients || [];

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

    // 2. Calculate per-prabhag & disease counts accurately
    const totalCounts = { Chikungunya: 0, Dengue: 0, Malaria: 0, JE: 0 };
    const prabhagCounts = {};
    for (let p = 1; p <= 38; p++) {
      prabhagCounts[p] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0, Total: 0 };
    }

    if (Array.isArray(patients)) {
      patients.forEach(patient => {
        let pNum = patient.prabhagNum || this.extractPrabhagNumber(patient.prabhag) || this.extractPrabhagNumber(patient.ward) || this.extractPrabhagNumber(patient.Ward_Name);
        if (!pNum && patient.prabhag) pNum = parseInt(patient.prabhag, 10);

        const dStr = (patient.disease || '').toLowerCase();
        let diseaseCat = 'Dengue';

        if (dStr.includes('chikun')) {
          diseaseCat = 'Chikungunya';
          totalCounts.Chikungunya++;
        } else if (dStr.includes('malaria')) {
          diseaseCat = 'Malaria';
          totalCounts.Malaria++;
        } else if (dStr.includes('je') || dStr.includes('encephalitis') || dStr.includes('scrub') || dStr.includes('typhus')) {
          diseaseCat = 'JE';
          totalCounts.JE++;
        } else {
          diseaseCat = 'Dengue';
          totalCounts.Dengue++;
        }

        if (pNum && prabhagCounts[pNum]) {
          prabhagCounts[pNum][diseaseCat]++;
          prabhagCounts[pNum].Total++;
        }
      });
    }

    // Update Floating Disease Stats Card
    this.updateDiseaseStatsCard(totalCounts);

    // 3. Render Ward Choropleth Polygons (WARDS_GEOJSON)
    let geoData = (typeof WARDS_GEOJSON !== 'undefined' && WARDS_GEOJSON) ? WARDS_GEOJSON : this.geoJsonData;

    if (geoData) {
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const rawName = feature.properties?.name || '';
          const pNum = this.extractPrabhagNumber(rawName);
          const count = pNum && prabhagCounts[pNum] ? prabhagCounts[pNum].Total : 0;

          // Choropleth Density Color Scale
          let fillColor = '#dcfce7'; // Zero Cases (Light Green)
          let fillOpacity = 0.85;

          if (count > 50) fillColor = '#b91c1c';       // Critical Dark Red
          else if (count > 25) fillColor = '#dc2626';  // High Red
          else if (count > 10) fillColor = '#ea580c';  // Moderate-High Orange
          else if (count > 4) fillColor = '#f59e0b';   // Moderate Yellow-Orange
          else if (count >= 1) fillColor = '#fde047';  // Low Cases Light Yellow
          else fillColor = '#dcfce7';                  // Zero Cases

          return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            color: '#1d4ed8', // Crisp blue boundary outline
            weight: 2.2,
            opacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const rawName = (feature.properties?.name || 'Ward').trim();
          const pNum = this.extractPrabhagNumber(rawName);
          const mappedZone = (pNum && wardZoneLookup[pNum]) ? wardZoneLookup[pNum] : (wardZoneLookup[rawName] || 'Municipal Zone');
          const pData = (pNum && prabhagCounts[pNum]) ? prabhagCounts[pNum] : { Total: 0, Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0 };

          // Centroid Circular Ward Badge
          try {
            const centroid = layer.getBounds().getCenter();
            if (pNum && centroid) {
              const badgeIcon = L.divIcon({
                className: 'ward-centroid-badge-wrapper',
                html: `<div class="ward-centroid-circle-badge ${pData.Total > 25 ? 'badge-critical' : (pData.Total > 0 ? 'badge-cases' : 'badge-zero')}">${pNum}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
              });

              const badgeMarker = L.marker(centroid, { icon: badgeIcon, interactive: false });
              this.wardBadgesGroup.addLayer(badgeMarker);
            }
          } catch (e) {
            console.warn('Centroid badge warning:', e);
          }

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
                  <span>Active Patient Burden:</span>
                  <span style="color: #dc2626; font-size: 15px;">${pData.Total} cases</span>
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

      try {
        this.geoDataBounds = geoJsonLayer.getBounds();
        if (this.geoDataBounds.isValid()) {
          this.map.fitBounds(this.geoDataBounds, { padding: [25, 25] });
        }
      } catch (e) {
        console.warn('fitBounds warning:', e);
      }
    }

    // 4. Plot Healthcare Facilities (Hospitals)
    Object.entries(HOSPITAL_COORDS).forEach(([hospName, coords]) => {
      const hospIcon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `<div style="background: #10b981; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
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
      if (this.map) {
        this.map.invalidateSize();
        if (this.geoDataBounds && this.geoDataBounds.isValid()) {
          this.map.fitBounds(this.geoDataBounds, { padding: [25, 25] });
        }
      }
    }, 150);
  },

  addFloatingCards() {
    // Disease Types Card (Bottom Left)
    const diseaseControl = L.control({ position: 'bottomleft' });
    diseaseControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-floating-panel map-disease-panel');
      div.style.background = '#ffffff';
      div.style.padding = '10px 14px';
      div.style.borderRadius = '12px';
      div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      div.style.border = '1px solid #e2e8f0';
      div.style.marginBottom = '10px';
      div.style.minWidth = '160px';
      div.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

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
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    diseaseControl.addTo(this.map);

    // Case Density Legend Card (Bottom Left)
    const densityControl = L.control({ position: 'bottomleft' });
    densityControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-floating-panel map-density-panel');
      div.style.background = '#ffffff';
      div.style.padding = '10px 14px';
      div.style.borderRadius = '12px';
      div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      div.style.border = '1px solid #e2e8f0';
      div.style.marginBottom = '10px';
      div.style.minWidth = '160px';
      div.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

      div.innerHTML = `
        <div style="font-size: 0.78rem; font-weight: 800; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span style="color: #2563eb;">📊</span> Case Density
        </div>
        <div style="font-size: 0.75rem; color: #334155; line-height: 1.7;">
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#b91c1c; border-radius:2px;"></div> Critical / High</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#ea580c; border-radius:2px;"></div> Moderate-High</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#f59e0b; border-radius:2px;"></div> Moderate</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#fde047; border-radius:2px; border:1px solid #cbd5e1;"></div> Low Cases</div>
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#dcfce7; border-radius:2px; border:1px solid #cbd5e1;"></div> Zero Cases</div>
        </div>
      `;
      L.DomEvent.disableClickPropagation(div);
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
