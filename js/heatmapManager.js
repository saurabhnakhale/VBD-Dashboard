/**
 * HeatmapManager.js - Renders an interactive 2D Case Density Matrix Heatmap
 * representing disease intensity across Zones (1-10) and Prabhags/Months.
 */



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
    let rawZone = row.Zone || row.zone || row['Zone Name'] || row.zoneName || (row.zoneNum ? `Zone ${row.zoneNum}` : '');
    if (!rawZone) return;

    let zNum = parseInt(rawZone.toString().replace(/[^0-9]/g, ''), 10);
    if (isNaN(zNum) || zNum < 1 || zNum > 10) return;
    const zKey = `Zone ${zNum}`;

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
    <div style="overflow-x: auto; overflow-y: auto; max-height: 310px; width: 100%; border: 1px solid #1e293b; border-radius: 8px;" class="custom-scrollbar">
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; color: #f8fafc; line-height: 1.2;">
        <thead>
          <tr style="background: #1e293b; color: #94a3b8; position: sticky; top: 0; z-index: 2;">
            <th style="padding: 6px 8px; border: 1px solid #334155; text-align: left;">Zone</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; color: #a855f7;">Dengue</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; color: #ec4899;">Chikungunya</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; color: #06b6d4;">Malaria</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; color: #f59e0b;">Scrub / JE</th>
            <th style="padding: 6px 8px; border: 1px solid #334155; color: #ffffff;">Total Burden</th>
          </tr>
        </thead>
        <tbody>
          ${zones.map(z => {
            const zNum = parseInt(z.replace('Zone ', ''), 10);
            const zName = (typeof ZONE_MAP !== 'undefined' && ZONE_MAP[zNum]) ? ` (${ZONE_MAP[zNum].split(' ')[0]})` : '';
            return `
            <tr>
              <td style="padding: 4px 8px; font-weight: bold; text-align: left; background: #0f172a; border: 1px solid #1e293b; white-space: nowrap;">${z}${zName}</td>
              <td style="padding: 4px 6px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].dengue : 0)}">${matrix[z] ? matrix[z].dengue : 0}</td>
              <td style="padding: 4px 6px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].chikungunya : 0)}">${matrix[z] ? matrix[z].chikungunya : 0}</td>
              <td style="padding: 4px 6px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].malaria : 0)}">${matrix[z] ? matrix[z].malaria : 0}</td>
              <td style="padding: 4px 6px; border: 1px solid #1e293b; ${getHeatColor(matrix[z] ? matrix[z].other : 0)}">${matrix[z] ? matrix[z].other : 0}</td>
              <td style="padding: 4px 6px; border: 1px solid #1e293b; background: #131d31; font-weight: bold; color: #ffffff;">${matrix[z] ? matrix[z].total : 0}</td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}
