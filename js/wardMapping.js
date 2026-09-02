/**
 * WardMapping.js - Integrated Ward & Zone Mapping & Coordinate Detection Engine
 * Exported and adapted from MapComponentExport (wardMapping.ts)
 */

const RAW_WARD_MAPPINGS = [
  { name: 'Prabhag No. 04', description: 'Zone No. 8 Lakadganj' },
  { name: 'Prabhag No. 23', description: 'Zone No. 8 Lakadganj' },
  { name: 'Prabhag No. 24', description: 'Zone No. 8 Lakadganj' },
  { name: 'Prabhag No. 25', description: 'Zone No. 8 Lakadganj' },
  { name: 'Prabhag No. 01', description: 'Zone No.10 Mangalwari' },
  { name: 'Prabhag No. 09', description: 'Zone No.10 Mangalwari' },
  { name: 'Prabhag No. 10', description: 'Zone No.10 Mangalwari' },
  { name: 'Prabhag No. 11', description: 'Zone No.10 Mangalwari' },
  { name: 'Prabhag No. 12', description: 'Zone No. 2 Dharmpeth' },
  { name: 'Prabhag No. 13', description: 'Zone No. 2 Dharmpeth' },
  { name: 'Prabhag No. 14', description: 'Zone No. 2 Dharmpeth' },
  { name: 'Prabhag No. 15', description: 'Zone No. 2 Dharmpeth' },
  { name: 'Prabhag No. 17', description: 'Zone No. 4 Dhantoli' },
  { name: 'Prabhag No. 33', description: 'Zone No. 4 Dhantoli' },
  { name: 'Prabhag No. 35', description: 'Zone No. 4 Dhantoli' },
  { name: 'Prabhag No. 16', description: 'Zone No. 1 Laxmi Nagar' },
  { name: 'Prabhag No. 36', description: 'Zone No. 1 Laxmi Nagar' },
  { name: 'Prabhag No. 37', description: 'Zone No. 1 Laxmi Nagar' },
  { name: 'Prabhag No. 38', description: 'Zone No. 1 Laxmi Nagar' },
  { name: 'Prabhag No. 29', description: 'Zone No. 3 Hanuman Nagar' },
  { name: 'Prabhag No. 31', description: 'Zone No. 3 Hanuman Nagar' },
  { name: 'Prabhag No. 32', description: 'Zone No. 3 Hanuman Nagar' },
  { name: 'Prabhag No. 34', description: 'Zone No. 3 Hanuman Nagar' },
  { name: 'Prabhag No. 28', description: 'Zone No. 5 Nehru Nagar' },
  { name: 'Prabhag No. 30', description: 'Zone No. 5 Nehru Nagar' },
  { name: 'Prabhag No. 27', description: 'Zone No. 5 Nehru Nagar' },
  { name: 'Prabhag No. 18', description: 'Zone No. 6 Gandhibag' },
  { name: 'Prabhag No. 02', description: 'Zone No. 9 AashiNagar' },
  { name: 'Prabhag No. 22', description: 'Zone No. 6 Gandhibag' },
  { name: 'Prabhag No. 19', description: 'Zone No. 6 Gandhibag' },
  { name: 'Prabhag No. 08', description: 'Zone No. 6 Gandhibag' },
  { name: 'Prabhag No. 07', description: 'Zone No. 9 AashiNagar' },
  { name: 'Prabhag No. 26', description: 'Zone No. 5 Nehru Nagar' },
  { name: 'Prabhag No. 20', description: 'Zone No. 7 Satranjipura' },
  { name: 'Prabhag No. 05', description: 'Zone No. 7 Satranjipura' },
  { name: 'Prabhag No. 21', description: 'Zone No. 7 Satranjipura' },
  { name: 'Prabhag No. 06', description: 'Zone No. 9 AashiNagar' },
  { name: 'Prabhag No. 03', description: 'Zone No. 9 AashiNagar' }
];

const WardMapping = {
  mapLookup: {},

  cleanWardName(rawWard) {
    if (!rawWard) return 'Unknown';
    let v = String(rawWard).trim();
    if (v.endsWith('.0')) v = v.slice(0, -2);
    v = v.replace(/^(prabhag|ward)\s*(no\.?)?\s*/i, '');
    v = v.trim().replace(/^0+/, '');
    return v === '' ? '0' : v;
  },

  formatFullWardName(rawWard) {
    if (!rawWard) return 'Unassigned';
    const str = String(rawWard).trim();
    if (str.toLowerCase() === 'unassigned' || str.toLowerCase() === 'unknown' || str === '') {
      return 'Unassigned';
    }
    const digitsOnly = str.replace(/\D+/g, '');
    if (digitsOnly) {
      return `Prabhag No. ${digitsOnly.padStart(2, '0')}`;
    }
    return str;
  },

  cleanZoneName(rawZone) {
    if (!rawZone || rawZone.toUpperCase() === 'N/A' || rawZone.toUpperCase() === 'UNKNOWN') return '';
    return String(rawZone)
      .replace(/^(Zone No\.?\s*|Zone No\s*)/i, '')
      .trim();
  },

  getZoneForWard(wardName, existingZone) {
    const z = this.cleanZoneName(existingZone);
    if (z) return z;

    const cleanWard = this.cleanWardName(wardName);
    if (cleanWard && this.mapLookup[cleanWard]) {
      return this.mapLookup[cleanWard];
    }
    if (wardName && this.mapLookup[wardName]) {
      return this.mapLookup[wardName];
    }

    const digitsOnly = String(wardName || '').replace(/\D+/g, '').replace(/^0+/, '');
    if (digitsOnly && this.mapLookup[digitsOnly]) {
      return this.mapLookup[digitsOnly];
    }

    return 'Unknown Zone';
  },

  isPointInPolygon(point, polygon) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  detectWardFromCoordinates(lat, lng, geoData) {
    const data = geoData || (typeof WARDS_GEOJSON !== 'undefined' ? WARDS_GEOJSON : null);
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || !data || !data.features) return null;

    for (const feature of data.features) {
      if (!feature.geometry || !feature.properties) continue;
      const name = feature.properties.name || '';
      const cleanW = this.cleanWardName(name);

      const geomType = feature.geometry.type;
      const coords = feature.geometry.coordinates;

      if (geomType === 'Polygon') {
        for (const ring of coords) {
          if (this.isPointInPolygon([lng, lat], ring)) return cleanW;
        }
      } else if (geomType === 'MultiPolygon') {
        for (const poly of coords) {
          for (const ring of poly) {
            if (this.isPointInPolygon([lng, lat], ring)) return cleanW;
          }
        }
      }
    }

    return null;
  }
};

// Initialize lookup map
RAW_WARD_MAPPINGS.forEach(item => {
  const cleanW = WardMapping.cleanWardName(item.name);
  const cleanZ = WardMapping.cleanZoneName(item.description);
  WardMapping.mapLookup[cleanW] = cleanZ;
  WardMapping.mapLookup[item.name] = cleanZ;
});
