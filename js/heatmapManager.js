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

const HeatmapManager = {
  render(patients) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const months = ['June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const matrix = {};

    for (let z = 1; z <= 10; z++) {
      matrix[z] = {};
      months.forEach(m => { matrix[z][m] = 0; });
    }

    let maxVal = 0;
    patients.forEach(p => {
      const z = p.zoneNum || 10;
      const m = p.month || 'July';
      if (!matrix[z]) matrix[z] = {};
      matrix[z][m] = (matrix[z][m] || 0) + 1;
      if (matrix[z][m] > maxVal) maxVal = matrix[z][m];
    });

    if (maxVal === 0) maxVal = 1;

    let html = `
      <div class="heatmap-wrapper">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th>Zone / Month</th>
              ${months.map(m => `<th>${m}</th>`).join('')}
              <th>Total Intensity</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (let z = 1; z <= 10; z++) {
      const zoneName = `Zone ${z} (${ZONE_MAP[z] ? ZONE_MAP[z].split(' ')[0] : ''})`;
      let zoneTotal = 0;

      html += `<tr><td style="text-align: left; font-weight: 700; color: var(--text-primary);">${zoneName}</td>`;

      months.forEach(m => {
        const count = matrix[z][m] || 0;
        zoneTotal += count;
        const ratio = count / maxVal;
        
        let bg = 'rgba(30, 41, 59, 0.4)';
        if (count > 0) {
          const alpha = 0.3 + (ratio * 0.7);
          if (ratio > 0.6) bg = `rgba(239, 68, 68, ${alpha})`;
          else if (ratio > 0.3) bg = `rgba(245, 158, 11, ${alpha})`;
          else bg = `rgba(99, 102, 241, ${alpha})`;
        }

        html += `
          <td style="background: ${bg};" title="${zoneName} - ${m}: ${count} cases">
            ${count > 0 ? count : '-'}
          </td>
        `;
      });

      html += `<td style="font-weight: 800; color: var(--accent-secondary);">${zoneTotal}</td></tr>`;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }
};
