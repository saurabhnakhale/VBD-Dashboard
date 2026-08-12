/**
 * HeatmapManager.js - Renders an interactive 2D Case Density Matrix Heatmap
 * representing disease intensity across Zones (1-10) and Prabhags/Months.
 */

const HeatmapManager = {
  render(patients) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    // Collect matrix data: Zone (Rows 1..10) vs Top Prabhags or Months
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

    // Generate HTML Table Heatmap
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
        
        // Color scale calculation: dark blue -> amber -> bright red
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
