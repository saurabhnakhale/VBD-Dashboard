/**
 * HeatmapManager.js - Renders an interactive 2D Case Density Matrix Heatmap
 * representing disease intensity across Zones (1-10) and Prabhags/Months.
 */

function processHeatmapData(records) {
  const matrix = {};
  let totalCount = 0;

  if (!records || !Array.isArray(records)) return matrix;

  records.forEach(row => {
    // 1. Normalize field keys safely
    const zone = row.Zone || row.zone || row.zoneName || `Zone ${row.zoneNum || '1'}` || 'Unspecified Zone';
    let prabhag = row.Prabhag || row.prabhag || row.prabhag_no || 'P0';
    
    // Ensure Prabhag format matches header labels (e.g., "P16" or "16")
    if (!prabhag.toString().startsWith('P') && prabhag !== 'P0') {
      prabhag = `P${prabhag}`;
    }

    const disease = (row.Disease || row.disease || '').toLowerCase();

    // 2. Initialize Matrix Nodes
    if (!matrix[zone]) matrix[zone] = {};
    if (!matrix[zone][prabhag]) {
      matrix[zone][prabhag] = { total: 0, dengue: 0, chikungunya: 0, malaria: 0, scrub: 0 };
    }

    // 3. Increment Counts
    matrix[zone][prabhag].total += 1;
    totalCount += 1;

    if (disease.includes('dengue')) matrix[zone][prabhag].dengue += 1;
    else if (disease.includes('chikungunya') || disease.includes('chikun')) matrix[zone][prabhag].chikungunya += 1;
    else if (disease.includes('malaria')) matrix[zone][prabhag].malaria += 1;
    else matrix[zone][prabhag].scrub += 1;
  });

  // 4. Update UI Counter
  const totalElem = document.getElementById('total-cases-count');
  if (totalElem) totalElem.textContent = `Total Cases: ${totalCount}`;

  return matrix;
}

function renderMatrixCell(zoneData, prabhagKey) {
  if (!zoneData) return `<td class="empty-cell">-</td>`;
  const cellData = zoneData[prabhagKey];

  // Agar koi case nahi hai
  if (!cellData || cellData.total === 0) {
    return `<td class="empty-cell">-</td>`;
  }

  // Exact Disease Numbers dikhane ke liye
  return `
    <td class="case-number-cell">
      <div class="disease-counts-wrapper">
        ${cellData.dengue > 0 ? `<span class="count-badge dengue-badge" title="Dengue: ${cellData.dengue}">${cellData.dengue}D</span>` : ''}
        ${cellData.chikungunya > 0 ? `<span class="count-badge chik-badge" title="Chikungunya: ${cellData.chikungunya}">${cellData.chikungunya}C</span>` : ''}
        ${cellData.malaria > 0 ? `<span class="count-badge malaria-badge" title="Malaria: ${cellData.malaria}">${cellData.malaria}M</span>` : ''}
        ${cellData.scrub > 0 ? `<span class="count-badge scrub-badge" title="Scrub Typhus / JE: ${cellData.scrub}">${cellData.scrub}S</span>` : ''}
      </div>
    </td>
  `;
}

const HeatmapManager = {
  render(patients) {
    renderZoneDiseaseHeatmap(patients);
  }
};

// --- 2. RENDER ZONE × DISEASE HEATMAP MATRIX ---
function renderZoneDiseaseHeatmap(records) {
  const container = document.getElementById('zoneDiseaseHeatmapContainer') || document.getElementById('heatmap-container');
  if (!container || !records) return;

  const zones = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9', 'Zone 10'];
  const matrix = {};

  zones.forEach(z => {
    matrix[z] = { dengue: 0, chikungunya: 0, malaria: 0, other: 0, total: 0 };
  });

  records.forEach(row => {
    let rawZone = row.Zone || row.zone || row['Zone Name'] || row.zoneName;
    if (!rawZone && row.zoneNum) rawZone = `Zone ${row.zoneNum}`;
    if (!rawZone) rawZone = 'Zone 1';
    
    // Normalize format like "1" or "Zone 1"
    const zKey = rawZone.toString().toLowerCase().includes('zone') ? rawZone : `Zone ${rawZone}`;
    
    if (!matrix[zKey]) matrix[zKey] = { dengue: 0, chikungunya: 0, malaria: 0, other: 0, total: 0 };
    
    const disease = (row.Disease || row.disease || '').toLowerCase();
    matrix[zKey].total++;

    if (disease.includes('dengue')) matrix[zKey].dengue++;
    else if (disease.includes('chikungunya') || disease.includes('chikun')) matrix[zKey].chikungunya++;
    else if (disease.includes('malaria')) matrix[zKey].malaria++;
    else matrix[zKey].other++;
  });

  function getHeatColor(count) {
    if (count === 0) return 'background: #0b1120; color: #475569;';
    if (count < 10) return 'background: rgba(59, 130, 246, 0.2); color: #93c5fd;';
    if (count < 30) return 'background: rgba(245, 158, 11, 0.3); color: #fcd34d; font-weight: bold;';
    return 'background: rgba(239, 68, 68, 0.45); color: #fca5a5; font-weight: bold;';
  }

  let html = `
    <div style="overflow-x: auto; width: 100%; border: 1px solid #1e293b; border-radius: 8px;">
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px; color: #f8fafc;">
        <thead>
          <tr style="background: #1e293b; color: #94a3b8;">
            <th style="padding: 10px; border: 1px solid #334155; text-align: left;">Zone</th>
            <th style="padding: 10px; border: 1px solid #334155; color: #a855f7;">Dengue</th>
            <th style="padding: 10px; border: 1px solid #334155; color: #ec4899;">Chikungunya</th>
            <th style="padding: 10px; border: 1px solid #334155; color: #06b6d4;">Malaria</th>
            <th style="padding: 10px; border: 1px solid #334155; color: #f59e0b;">Scrub / JE</th>
            <th style="padding: 10px; border: 1px solid #334155; color: #ffffff;">Total Burden</th>
          </tr>
        </thead>
        <tbody>
          ${zones.map(z => {
            const zNum = parseInt(z.replace('Zone ', ''), 10);
            const zName = (typeof ZONE_MAP !== 'undefined' && ZONE_MAP[zNum]) ? ` (${ZONE_MAP[zNum].split(' ')[0]})` : '';
            return `
            <tr>
              <td style="padding: 8px 12px; font-weight: bold; text-align: left; background: #0f172a; border: 1px solid #1e293b;">${z}${zName}</td>
              <td style="padding: 8px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].dengue : 0)}">${matrix[z] ? matrix[z].dengue : 0}</td>
              <td style="padding: 8px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].chikungunya : 0)}">${matrix[z] ? matrix[z].chikungunya : 0}</td>
              <td style="padding: 8px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].malaria : 0)}">${matrix[z] ? matrix[z].malaria : 0}</td>
              <td style="padding: 8px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].other : 0)}">${matrix[z] ? matrix[z].other : 0}</td>
              <td style="padding: 8px; border: 1px solid #1e293b; background: #131d31; font-weight: bold; color: #ffffff;">${matrix[z] ? matrix[z].total : 0}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}
