/**
 * HeatmapManager.js - Renders Iwosan-style 2D Outbreak Density Matrix
 */

const HeatmapManager = {
  render(patients) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const months = ['June', 'July', 'August', 'September', 'October'];
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
      <table class="heatmap-grid-table">
        <thead>
          <tr>
            <th style="text-align: left;">Zone / Month</th>
            ${months.map(m => `<th>${m}</th>`).join('')}
            <th>Total Intensity</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (let z = 1; z <= 10; z++) {
      const zoneName = `Zone ${z} (${ZONE_MAP[z] ? ZONE_MAP[z].split(' ')[0] : ''})`;
      let zoneTotal = 0;

      html += `<tr><td style="text-align: left; font-weight: 700; color: var(--text-primary); font-size: 0.78rem;">${zoneName}</td>`;

      months.forEach(m => {
        const count = matrix[z][m] || 0;
        zoneTotal += count;
        const ratio = count / maxVal;
        
        let bg = 'rgba(26, 34, 59, 0.4)';
        let textColor = 'var(--text-muted)';
        if (count > 0) {
          const alpha = 0.35 + (ratio * 0.65);
          if (ratio > 0.5) { bg = `rgba(255, 42, 95, ${alpha})`; textColor = '#ffffff'; }
          else if (ratio > 0.25) { bg = `rgba(255, 183, 3, ${alpha})`; textColor = '#ffffff'; }
          else { bg = `rgba(37, 99, 235, ${alpha})`; textColor = '#ffffff'; }
        }

        html += `
          <td style="background: ${bg}; color: ${textColor};" title="${zoneName} - ${m}: ${count} cases">
            ${count > 0 ? count : '-'}
          </td>
        `;
      });

      html += `<td style="font-weight: 800; color: var(--accent-pink);">${zoneTotal}</td></tr>`;
    }

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }
};
