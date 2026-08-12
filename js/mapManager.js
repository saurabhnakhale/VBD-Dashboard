/**
 * MapManager.js - Manages Leaflet.js GIS spatial mapping, zone density layers,
 * hospital pin locations, and Sheet 2 High Risk Area overlays.
 */

// Coordinates for Nagpur Zones and key localities
const LOCALITY_COORDS = {
  // Zone 10: Mangalwari / Borgaon / Gorewada
  "Borgaon": [21.1850, 79.0550],
  "Bhupesh Nagar": [21.1880, 79.0520],
  "Gorewada": [21.1950, 79.0480],
  "Zingabai Takli": [21.1920, 79.0700],
  "Gittikhadan": [21.1750, 79.0510],
  "Jaripatka": [21.1860, 79.0900],
  "Patel Nagar": [21.1830, 79.0560],

  // Zone 2: Dharampeth / Seminary Hills / Katol Road
  "Katol Road": [21.1700, 79.0600],
  "Seminary Hills": [21.1620, 79.0550],
  "Friends Colony": [21.1780, 79.0490],
  "Deepak Nagar": [21.1760, 79.0540],
  "Dharampeth": [21.1440, 79.0660],
  "Shankar Nagar": [21.1380, 79.0680],
  "Futala": [21.1540, 79.0480],

  // Zone 1: Laxminagar
  "Laxmi Nagar": [21.1210, 79.0650],
  "Chatrapati Nagar": [21.1120, 79.0680],
  "Pratap Nagar": [21.1180, 79.0550],
  "Sonegaon": [21.0920, 79.0540],

  // Zone 3: Hanumannagar
  "Hanuman Nagar": [21.1250, 79.0950],
  "Manewada": [21.1020, 79.1020],
  "Hudkeshwar": [21.0900, 79.1150],

  // Zone 4: Dhantoli
  "Dhantoli": [21.1350, 79.0820],
  "Ajni": [21.1200, 79.0880],
  "Manish Nagar": [21.0980, 79.0780],

  // Zone 5: Nehru Nagar
  "Nandanvan": [21.1360, 79.1200],
  "Wathoda": [21.1420, 79.1380],

  // Zone 6: Gandhibagh
  "Mahal": [21.1450, 79.1020],
  "Mominpura": [21.1560, 79.0950],

  // Zone 7: Satranjipura
  "Satranjipura": [21.1680, 79.1050],
  "Itwari": [21.1580, 79.1100],

  // Zone 8: Lakadganj
  "Lakadganj": [21.1520, 79.1250],
  "Pardi": [21.1600, 79.1450],

  // Zone 9: Ashinagar
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

// Zone Centroids
const ZONE_CENTROIDS = {
  1: [21.1150, 79.0600],
  2: [21.1550, 79.0580],
  3: [21.1100, 79.1000],
  4: [21.1180, 79.0820],
  5: [21.1350, 79.1280],
  6: [21.1480, 79.0980],
  7: [21.1650, 79.1080],
  8: [21.1550, 79.1350],
  9: [21.1900, 79.1050],
  10: [21.1880, 79.0650]
};

const MapManager = {
  map: null,
  markersGroup: null,
  highRiskGroup: null,
  zoneLayerGroup: null,

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

    this.markersGroup = L.layerGroup().addTo(this.map);
    this.highRiskGroup = L.layerGroup().addTo(this.map);
    this.zoneLayerGroup = L.layerGroup().addTo(this.map);

    this.addMapLegend();
  },

  render(patients, highRiskAreas) {
    this.init();
    this.markersGroup.clearLayers();
    this.highRiskGroup.clearLayers();
    this.zoneLayerGroup.clearLayers();

    // 1. Plot Sheet 2 High-Risk Areas
    if (highRiskAreas && highRiskAreas.length > 0) {
      highRiskAreas.forEach(hr => {
        const allLocs = [
          ...hr.highRiskDengue.split(','),
          ...hr.highRiskChikungunya.split(',')
        ].map(s => s.trim()).filter(s => s.length > 2);

        allLocs.forEach(locName => {
          // Find closest matching coord
          const coordKey = Object.keys(LOCALITY_COORDS).find(k => k.toLowerCase() === locName.toLowerCase() || locName.toLowerCase().includes(k.toLowerCase()));
          if (coordKey) {
            const coords = LOCALITY_COORDS[coordKey];
            
            // Render High Risk Pulsing Circle
            const circle = L.circle(coords, {
              color: '#ef4444',
              fillColor: '#f43f5e',
              fillOpacity: 0.35,
              radius: 450,
              weight: 2
            });

            circle.bindPopup(`
              <div style="color: #0f172a; padding: 4px;">
                <strong style="color: #ef4444;">🚨 SHEET 2 HIGH RISK ZONE</strong><br/>
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

    // 2. Plot Zone Densities (Circles scaled by patient count)
    const zoneCounts = {};
    patients.forEach(p => {
      const z = p.zoneNum || 10;
      zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    });

    Object.entries(ZONE_CENTROIDS).forEach(([zNum, coords]) => {
      const count = zoneCounts[zNum] || 0;
      if (count > 0) {
        const radius = Math.min(1800, 400 + (count * 15));
        const circle = L.circle(coords, {
          color: '#6366f1',
          fillColor: '#818cf8',
          fillOpacity: 0.25,
          radius: radius,
          weight: 1.5
        });

        circle.bindPopup(`
          <div style="color: #0f172a;">
            <strong style="color: #6366f1;">Zone ${zNum}: ${ZONE_MAP[zNum] || ''}</strong><br/>
            <b>Filtered Patients:</b> ${count} cases<br/>
          </div>
        `);

        this.zoneLayerGroup.addLayer(circle);
      }
    });

    // 3. Plot Hospitals
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
        <strong style="display:block; margin-bottom: 6px;">Spatial Legend</strong>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #ef4444;"></div> Sheet 2 High Risk Hotspot</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #6366f1;"></div> Zone Outbreak Volume</div>
        <div class="map-legend-item"><div class="legend-color-dot" style="background: #10b981;"></div> Hospital / UPHC Node</div>
      `;
      return div;
    };
    legend.addTo(this.map);
  }
};
