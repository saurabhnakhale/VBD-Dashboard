/**
 * EntomologyManager.js - Manages Vector Entomological Surveillance (HI, CI, BI Indices)
 * Source: Google Sheets GID 302283847
 */

const EntomologyManager = {
  chart: null,

  render(entomologyRecords, selectedZone = 'ALL', selectedMonth = 'ALL') {
    if (!entomologyRecords || !Array.isArray(entomologyRecords)) return;

    // Filter records
    let filtered = entomologyRecords;
    if (selectedZone !== 'ALL') {
      const zNum = parseInt(selectedZone, 10);
      filtered = filtered.filter(r => r.zoneNum === zNum);
    }
    if (selectedMonth !== 'ALL') {
      filtered = filtered.filter(r => r.month.toLowerCase().includes(selectedMonth.toLowerCase()));
    }

    this.updateKPIs(filtered);
    this.renderTrendChart(entomologyRecords, selectedZone);
    this.renderZoneTable(filtered);
  },

  updateKPIs(records) {
    const hiElem = document.getElementById('kpi-hi-val');
    const ciElem = document.getElementById('kpi-ci-val');
    const biElem = document.getElementById('kpi-bi-val');

    if (!records || records.length === 0) {
      if (hiElem) hiElem.textContent = '0.0 %';
      if (ciElem) ciElem.textContent = '0.0 %';
      if (biElem) biElem.textContent = '0.0';
      return;
    }

    const totalHouses = records.reduce((acc, r) => acc + r.inspectedHouses, 0);
    const posHouses = records.reduce((acc, r) => acc + r.positiveHouses, 0);
    const totalContainers = records.reduce((acc, r) => acc + r.inspectedContainers, 0);
    const posContainers = records.reduce((acc, r) => acc + r.positiveContainers, 0);

    const avgHI = totalHouses > 0 ? ((posHouses / totalHouses) * 100).toFixed(1) : '0.0';
    const avgCI = totalContainers > 0 ? ((posContainers / totalContainers) * 100).toFixed(1) : '0.0';
    const avgBI = totalHouses > 0 ? ((posContainers / totalHouses) * 100).toFixed(1) : '0.0';

    if (hiElem) hiElem.textContent = `${avgHI} %`;
    if (ciElem) ciElem.textContent = `${avgCI} %`;
    if (biElem) biElem.textContent = `${avgBI}`;
  },

  renderTrendChart(allRecords, selectedZone) {
    const ctx = document.getElementById('chart-vector-indices')?.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    let records = allRecords;
    if (selectedZone !== 'ALL') {
      const zNum = parseInt(selectedZone, 10);
      records = records.filter(r => r.zoneNum === zNum);
    }

    const monthMap = {};
    records.forEach(r => {
      if (!monthMap[r.month]) {
        monthMap[r.month] = { houses: 0, posHouses: 0, containers: 0, posContainers: 0 };
      }
      monthMap[r.month].houses += r.inspectedHouses;
      monthMap[r.month].posHouses += r.positiveHouses;
      monthMap[r.month].containers += r.inspectedContainers;
      monthMap[r.month].posContainers += r.positiveContainers;
    });

    const months = Object.keys(monthMap);
    const hiData = months.map(m => {
      const d = monthMap[m];
      return d.houses > 0 ? parseFloat(((d.posHouses / d.houses) * 100).toFixed(1)) : 0;
    });
    const ciData = months.map(m => {
      const d = monthMap[m];
      return d.containers > 0 ? parseFloat(((d.posContainers / d.containers) * 100).toFixed(1)) : 0;
    });
    const biData = months.map(m => {
      const d = monthMap[m];
      return d.houses > 0 ? parseFloat(((d.posContainers / d.houses) * 100).toFixed(1)) : 0;
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'House Index (HI %)',
            data: hiData,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'Container Index (CI %)',
            data: ciData,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: 'Breteau Index (BI)',
            data: biData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' }, beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top', labels: { color: '#f8fafc', font: { size: 11, weight: 'bold' } } },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw}${item.datasetIndex === 2 ? '' : '%'}`
            }
          }
        }
      }
    });
  },

  renderZoneTable(records) {
    const container = document.getElementById('entomologyZoneTableContainer');
    if (!container) return;

    const zoneMap = {};
    for (let z = 1; z <= 10; z++) {
      zoneMap[z] = {
        zoneNum: z,
        zoneName: (typeof ZONE_MAP !== 'undefined' && ZONE_MAP[z]) ? ZONE_MAP[z] : `Zone ${z}`,
        houses: 0,
        posHouses: 0,
        containers: 0,
        posContainers: 0
      };
    }

    records.forEach(r => {
      if (zoneMap[r.zoneNum]) {
        zoneMap[r.zoneNum].houses += r.inspectedHouses;
        zoneMap[r.zoneNum].posHouses += r.positiveHouses;
        zoneMap[r.zoneNum].containers += r.inspectedContainers;
        zoneMap[r.zoneNum].posContainers += r.positiveContainers;
      }
    });

    let html = `
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px; color: #f8fafc;">
        <thead>
          <tr style="background: #1e293b; color: #94a3b8; position: sticky; top: 0; z-index: 2;">
            <th style="padding: 6px 8px; text-align: left; border: 1px solid #334155;">Municipal Zone</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">Inspected Houses</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">Pos. Houses</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">HI (%)</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">CI (%)</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">BI</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">Risk Status</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(zoneMap).map(z => {
            const hi = z.houses > 0 ? ((z.posHouses / z.houses) * 100).toFixed(1) : '0.0';
            const ci = z.containers > 0 ? ((z.posContainers / z.containers) * 100).toFixed(1) : '0.0';
            const bi = z.houses > 0 ? ((z.posContainers / z.houses) * 100).toFixed(1) : '0.0';
            const biVal = parseFloat(bi);

            let statusBadge = `<span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Low Risk</span>`;
            if (biVal >= 20.0) {
              statusBadge = `<span style="background: rgba(239, 68, 68, 0.25); color: #fca5a5; padding: 2px 6px; border-radius: 4px; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> Critical Alert</span>`;
            } else if (biVal >= 5.0) {
              statusBadge = `<span style="background: rgba(245, 158, 11, 0.25); color: #fcd34d; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Warning</span>`;
            }

            return `
              <tr>
                <td style="padding: 4px 8px; text-align: left; background: #0f172a; border: 1px solid #1e293b; font-weight: bold;">${z.zoneName}</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b;">${z.houses.toLocaleString()}</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b; color: #a855f7; font-weight: bold;">${z.posHouses.toLocaleString()}</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b; color: #a855f7;">${hi}%</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b; color: #ec4899;">${ci}%</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b; color: #06b6d4; font-weight: bold;">${bi}</td>
                <td style="padding: 4px 6px; border: 1px solid #1e293b;">${statusBadge}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }
};
