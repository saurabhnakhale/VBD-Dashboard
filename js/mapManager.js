/**
 * MapManager.js - GIS Spatial Mapping Engine
 * Complete implementation matching user's reference images:
 * 1. Expandable Layer Control Box (Default OSM, Clean Gray, Satellite View, Topographic Map)
 * 2. Map Centering Target Icon Button (re-centers & fits bounds to Nagpur Municipal Corporation)
 * 3. Zoom Controls (+ / -)
 * 4. Centroid Ward Badges (9, 26, 52, 29, 43, 34, 117, etc.)
 * 5. Disease Types & Case Density Floating UI Panels
 * 6. Time-Series Epidemic Outbreak Playback & Map View Modes
 */

// Locality & Hospital Coordinates
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
  heatGlowGroup: null,
  
  // Layer Base Maps (100% Free, NO API KEY)
  baseLayers: {},
  activeBaseLayer: null,

  currentPatients: [],
  geoDataBounds: null,
  mapViewMode: 'cluster', // 'cluster', 'wardCount', 'allPoints'

  // Playback states
  isPlaying: false,
  playbackTimer: null,
  playbackIndex: 0,
  uniqueDates: [],

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
        zoomControl: false, // We will add custom styled zoom & center controls
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
      this.heatGlowGroup = L.layerGroup().addTo(this.map);
      this.geoJsonGroup = L.layerGroup().addTo(this.map);
      this.wardBadgesGroup = L.layerGroup().addTo(this.map);
      this.markersGroup = L.layerGroup().addTo(this.map);

      // 4. Add Top-Right Controls (Layer Selector Box + Centering Target + Zoom +/-)
      this.addTopRightControls();

      // 5. Add Bottom-Left Floating Cards (Disease Types & Case Density)
      this.addFloatingCards();

      // 6. Bind Mode Switcher & Outbreak Playback Event Listeners
      this.bindControlsEvents();

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

    // Customize Layer Control Box HTML labels matching Image 1
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

      // Prevent map drag when clicking controls
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
            wardZoneLookup[`Prabhag ${pNum}`] = item.zone.trim();
            wardZoneLookup[`P${pNum}`] = item.zone.trim();
          }
        }
      });
    }

    // 2. Calculate per-prabhag & disease counts
    const totalCounts = { Chikungunya: 0, Dengue: 0, Malaria: 0, JE: 0 };
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

        // Plot Point Markers if mode is 'cluster' or 'allPoints'
        if ((this.mapViewMode === 'cluster' || this.mapViewMode === 'allPoints') && (patient.lat || patient.latitude || LOCALITY_COORDS[patient.locality])) {
          const lat = patient.lat || patient.latitude || LOCALITY_COORDS[patient.locality]?.[0];
          const lng = patient.lng || patient.longitude || LOCALITY_COORDS[patient.locality]?.[1];
          if (lat && lng) {
            let mColor = '#2563eb';
            if (diseaseCat === 'Dengue') mColor = '#ea580c';
            else if (diseaseCat === 'Malaria') mColor = '#1e1b4b';
            else if (diseaseCat === 'JE') mColor = '#a855f7';

            const pointMarker = L.circleMarker([lat, lng], {
              radius: 5,
              fillColor: mColor,
              color: '#ffffff',
              weight: 1.5,
              fillOpacity: 0.9
            });
            pointMarker.bindPopup(`<b>${patient.name || 'Patient'}</b><br/>Disease: ${patient.disease}<br/>Prabhag: ${pNum || 'N/A'}`);
            this.markersGroup.addLayer(pointMarker);
          }
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

          // Image Color Density Scheme
          let fillColor = '#dcfce7'; // Zero Cases
          let fillOpacity = 0.85;

          if (count > 15) fillColor = '#dc2626';     // Critical / High Red
          else if (count >= 9) fillColor = '#ea580c'; // Moderate-High Orange
          else if (count >= 4) fillColor = '#f59e0b'; // Moderate Yellow-Orange
          else if (count >= 1) fillColor = '#fde047'; // Low Cases Yellow
          else fillColor = '#dcfce7';                 // Zero Cases Light Green

          return {
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            color: '#1d4ed8', // Crisp blue boundary outline (Image 1 & 2 match)
            weight: 2.2,
            opacity: 1
          };
        },
        onEachFeature: (feature, layer) => {
          const rawName = (feature.properties?.name || 'Ward').trim();
          const pNum = this.extractPrabhagNumber(rawName);
          const mappedZone = (pNum && wardZoneLookup[pNum]) ? wardZoneLookup[pNum] : (wardZoneLookup[rawName] || 'Municipal Zone');
          const pData = (pNum && prabhagCounts[pNum]) ? prabhagCounts[pNum] : { Total: 0, Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0 };

          // Centroid Circular Ward Badge (Image Exact Match)
          try {
            const centroid = layer.getBounds().getCenter();
            if (pNum && centroid) {
              
              // Radial Outbreak Heat Glow for High-Burden Wards
              if (pData.Total >= 15) {
                const glowCircle = L.circle(centroid, {
                  radius: 1200,
                  color: 'transparent',
                  fillColor: '#dc2626',
                  fillOpacity: 0.4,
                  className: 'outbreak-heat-glow'
                });
                this.heatGlowGroup.addLayer(glowCircle);
              }

              // Circular Badge DivIcon
              const badgeIcon = L.divIcon({
                className: 'ward-centroid-badge-wrapper',
                html: `<div class="ward-centroid-circle-badge ${pData.Total > 15 ? 'badge-critical' : (pData.Total > 0 ? 'badge-cases' : 'badge-zero')}">${pNum}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
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
        if (this.geoDataBounds.isValid() && !this.hasFittedBounds) {
          this.map.fitBounds(this.geoDataBounds, { padding: [25, 25] });
          this.hasFittedBounds = true;
        }
      } catch (e) {
        console.warn('fitBounds warning:', e);
      }
    }

    // 4. Plot Healthcare Facilities
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
      if (this.map) this.map.invalidateSize();
    }, 100);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 350);
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
          <div style="display: flex; align-items: center; gap: 8px;"><div style="width:14px; height:12px; background:#dc2626; border-radius:2px;"></div> Critical / High</div>
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
  },

  bindControlsEvents() {
    // Mode Switcher Radio buttons
    const radios = document.querySelectorAll('input[name="mapViewMode"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.mapViewMode = e.target.value;
        this.render(this.currentPatients);
      });
    });

    // Outbreak Playback Button
    const btnPlayback = document.getElementById('btn-outbreak-playback');
    if (btnPlayback) {
      btnPlayback.addEventListener('click', () => {
        this.togglePlayback();
      });
    }
  },

  togglePlayback() {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  },

  startPlayback() {
    if (!this.currentPatients || this.currentPatients.length === 0) return;
    
    // Sort unique dates
    const dateSet = new Set();
    this.currentPatients.forEach(p => {
      if (p.rawDate || p.Date) dateSet.add(p.rawDate || p.Date);
    });
    this.uniqueDates = Array.from(dateSet).sort();
    if (this.uniqueDates.length === 0) return;

    this.isPlaying = true;
    this.playbackIndex = 0;
    const btnPlayback = document.getElementById('btn-outbreak-playback');
    if (btnPlayback) {
      btnPlayback.innerHTML = `<i class="fa-solid fa-pause"></i> Pause Playback`;
      btnPlayback.style.background = '#fef2f2';
      btnPlayback.style.color = '#dc2626';
    }

    if (this.playbackTimer) clearInterval(this.playbackTimer);

    this.playbackTimer = setInterval(() => {
      if (this.playbackIndex >= this.uniqueDates.length) {
        this.stopPlayback();
        return;
      }
      const cutoffDate = this.uniqueDates[this.playbackIndex];
      const filtered = this.currentPatients.filter(p => (p.rawDate || p.Date) <= cutoffDate);
      this.render(filtered);
      this.playbackIndex++;
    }, 800);
  },

  stopPlayback() {
    this.isPlaying = false;
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    const btnPlayback = document.getElementById('btn-outbreak-playback');
    if (btnPlayback) {
      btnPlayback.innerHTML = `<i class="fa-solid fa-film"></i> Epidemic Outbreak Playback`;
    }
    this.render(this.currentPatients);
  }
};
