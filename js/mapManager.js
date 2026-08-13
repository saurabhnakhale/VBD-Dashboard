/**
 * MapManager.js - Leaflet.js GIS spatial mapping with Ward GeoJSON boundaries (wards.geojson / WARDS_GEOJSON),
 * Ward-to-Zone Mapping (ward_zone_mapping.json / WARD_ZONE_MAPPING), high-contrast choropleth polygons,
 * hospital pins, and Sheet 2 High Risk overlays.
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
  geoJsonData: null,
  hasFittedBounds: false,

  init() {
    if (this.map) return;

    // Center on Nagpur
    this.map = L.map('map-container', {
      center: [21.1458, 79.0882],
      zoom: 12,
      zoomControl: true
    });

    // Dark Tile Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    this.geoJsonGroup = L.layerGroup().addTo(this.map);
    this.highRiskGroup = L.layerGroup().addTo(this.map);
    this.markersGroup = L.layerGroup().addTo(this.map);

    this.addMapLegend();
  },

  extractPrabhagNumber(nameStr) {
    if (!nameStr) return null;
    const match = nameStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  },

  async render(patients, highRiskAreas) {
    this.init();

    this.geoJsonGroup.clearLayers();
    this.markersGroup.clearLayers();
    this.highRiskGroup.clearLayers();

    // 1. Build lookup dictionary from WARD_ZONE_MAPPING
    const wardZoneLookup = {};
    if (typeof WARD_ZONE_MAPPING !== 'undefined' && Array.isArray(WARD_ZONE_MAPPING)) {
      WARD_ZONE_MAPPING.forEach(item => {
        if (item.ward && item.zone) {
          wardZoneLookup[item.ward.trim()] = item.zone.trim();
        }
      });
    }

    // 2. Calculate per-prabhag case breakdown
    const prabhagCounts = {};
    patients.forEach(p => {
      const pNum = p.prabhag ? parseInt(p.prabhag, 10) : null;
      if (pNum) {
        if (!prabhagCounts[pNum]) {
          prabhagCounts[pNum] = { Dengue: 0, Chikungunya: 0, Malaria: 0, ScrubTyphus: 0, Total: 0 };
        }
        const dStr = (p.disease || '').toLowerCase();
        if (dStr.includes('chikun')) prabhagCounts[pNum].Chikungunya++;
        else if (dStr.includes('malaria')) prabhagCounts[pNum].Malaria++;
        else if (dStr.includes('japanese') || dStr.includes('encephalitis') || dStr.includes('je') || dStr.includes('scrub') || dStr.includes('typhus')) prabhagCounts[pNum].ScrubTyphus++;
        else prabhagCounts[pNum].Dengue++;

        prabhagCounts[pNum].Total++;
      }
    });

    // 3. Fetch or load GeoJSON features (wards.geojson / WARDS_GEOJSON)
    let geoData = (typeof WARDS_GEOJSON !== 'undefined' && WARDS_GEOJSON) ? WARDS_GEOJSON : this.geoJsonData;

    if (!geoData) {
      try {
        const resp = await fetch('wards.geojson');
        if (resp.ok) {
          geoData = await resp.json();
          this.geoJsonData = geoData;
        }
      } catch (e) {
        console.warn("Unable to fetch wards.geojson fallback:", e);
      }
    }

    if (geoData) {
      const geoJsonLayer = L.geoJSON(geoData, {
        style: (feature) => {
          const rawName = feature.properties?.name || '';
          const pNum = this.extractPrabhagNumber(rawName);
          const count = pNum && prabhagCounts[pNum] ? prabhagCounts[pNum].Total : 0;

          let fillColor = '#6366f1';
          let strokeColor = '#38bdf8';
          let weight = 2.0;

          if (count > 15) {
            fillColor = '#ef4444';
            strokeColor = '#f43f5e';
            weight = 2.5;
          } else if (count > 8) {
            fillColor = '#ec4899';
            strokeColor = '#f472b6';
            weight = 2.2;
          } else if (count > 3) {
            fillColor = '#f59e0b';
            strokeColor = '#fbbf24';
            weight = 2.0;
          } else if (count > 0) {
            fillColor = '#06b6d4';
            strokeColor = '#22d3ee';
            weight = 1.8;
          }

          return {
            fillColor: fillColor,
            fillOpacity: 0.65,
            color: strokeColor,
            weight: weight,
            opacity: 0.95
          };
        },
        onEachFeature: (feature, layer) => {
          const wardName = (feature.properties?.name || 'Ward').trim();
          const mappedZone = wardZoneLookup[wardName] || (feature.properties?.description || 'NMC Zone').trim();
          const pNum = this.extractPrabhagNumber(wardName);
          const pData = (pNum && prabhagCounts[pNum])
            ? prabhagCounts[pNum]
            : { Total: 0, Dengue: 0, Chikungunya: 0, Malaria: 0, ScrubTyphus: 0 };

          layer.bindPopup(`
            <div style="color: #0f172a; padding: 4px; min-width: 200px;">
              <strong style="color: #4f46e5; font-size: 14px;">🏛️ ${wardName}</strong><br/>
              <span style="color: #475569; font-size: 12px;"><b>Mapped Zone:</b> ${mappedZone}</span>
              <hr style="margin: 6px 0; border: 0; border-top: 1px solid #cbd5e1;"/>
              <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">
                📊 Active Case Burden: <span style="color: #dc2626;">${pData.Total} cases</span>
              </div>
              <div style="font-size: 11px; color: #334155; line-height: 1.5;">
                • 🦟 <b>Dengue:</b> ${pData.Dengue}<br/>
                • 🦠 <b>Chikungunya:</b> ${pData.Chikungunya}<br/>
                • 🔬 <b>Malaria:</b> ${pData.Malaria}<br/>
                • 🐛 <b>Scrub Typhus / JE:</b> ${pData.ScrubTyphus}
              </div>
            </div>
          `);

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({ weight: 3.5, color: '#ffffff', fillOpacity: 0.9 });
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

      // Fit map bounds to GeoJSON on initial load
      if (!this.hasFittedBounds) {
        try {
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [20, 20] });
            this.hasFittedBounds = true;
          }
        } catch (e) {
          console.warn('fitBounds warning:', e);
        }
      }
    }

    // 4. Plot Sheet 2 High-Risk Hotspot Overlays
    if (highRiskAreas && highRiskAreas.length > 0) {
      highRiskAreas.forEach(hr => {
        const allLocs = [
          ...hr.highRiskDengue.split(','),
          ...hr.highRiskChikungunya.split(',')
        ].map(s => s.trim()).filter(s => s.length > 2);

        allLocs.forEach(locName => {
          const coordKey = Object.keys(LOCALITY_COORDS).find(k => k.toLowerCase() === locName.toLowerCase() || locName.toLowerCase().includes(k.toLowerCase()));
          if (coordKey) {
            const coords = LOCALITY_COORDS[coordKey];
            
            const circle = L.circle(coords, {
              color: '#ef4444',
              fillColor: '#f43f5e',
              fillOpacity: 0.45,
              radius: 400,
              weight: 2
            });

            circle.bindPopup(`
              <div style="color: #0f172a; padding: 4px;">
                <strong style="color: #ef4444;">🚨 SHEET 2 HIGH RISK HOTSPOT</strong><br/>
                <b>Locality:</b> ${locName}<br/>
                <b>Zone:</b> ${hr.zoneName || `Zone ${hr.zoneNum}`}<br/>
                <b>Prabhag:</b> ${hr.prabhag}<br/>
                <hr style="margin: 4px 0; border: 0; border-top: 1px solid #ddd;"/>
                <small><b>Dengue High Risk:</b> ${hr.highRiskDengue || 'None'}</small><br/>
                <small><b>Chikungunya High Risk:</b> ${hr.highRiskChikungunya || 'None'}</small>
              </div>
            `);

            this.highRiskGroup.addLayer(circle);
          }
        });
      });
    }

    // 5. Plot Hospitals
    Object.entries(HOSPITAL_COORDS).forEach(([hospName, coords]) => {
      const hospIcon = L.divIcon({
        className: 'custom-hosp-marker',
        html: `<div style="background: #10b981; color: #fff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.5);"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker(coords, { icon: hospIcon });
      marker.bindPopup(`
        <div style="color: #0f172a;">
          <strong style="color: #10b981;">🏥 ${hospName}</strong><br/>
          <i>Healthcare Notification Facility</i>
        </div>
      `);
      this.markersGroup.addLayer(marker);
    });
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
