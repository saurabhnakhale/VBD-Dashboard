/**
 * ChartManager.js - Manages 6 advanced Chart.js visualizations for the dashboard.
 * Chart 1: Case Trend Over Time Trendlines (Dengue, Chikungunya, Malaria) with By Day / By Month / By Year pill selectors.
 * Dengue (Positive) is removed as requested.
 */

const ChartManager = {
  charts: {},
  currentPatients: [],
  currentGranularity: 'daily',

  init() {
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.borderRadius = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  },

  renderAll(patients) {
    this.init();
    this.currentPatients = patients;
    this.renderEpidemicCurve(patients, this.currentGranularity);
    this.renderDemographicPyramid(patients);
    this.renderFacilityBurden(patients);
    this.renderZonePrabhagDistribution(patients);
    this.renderHighRiskCorrelation(patients);
    this.renderAgeDiseaseVulnerability(patients);
    this.setupGranularityListeners();
  },

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  },

  setupGranularityListeners() {
    const container = document.getElementById('epicurve-granularity-toggle');
    if (!container || container.dataset.initialized) return;

    container.dataset.initialized = 'true';
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn') || e.target.closest('.btn-granularity');
      if (!btn) return;

      container.querySelectorAll('.pill-btn, .btn-granularity').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const gran = btn.dataset.granularity || 'daily';
      this.currentGranularity = gran;
      this.renderEpidemicCurve(this.currentPatients, gran);
    });
  },

  getDiseaseCategory(disStr) {
    const d = (disStr || '').toLowerCase();
    if (d.includes('positive')) return 'EXCLUDE'; // Explicitly remove Dengue (Positive)
    if (d.includes('chikungunya') || d.includes('chikun')) return 'Chikungunya';
    if (d.includes('malaria')) return 'Malaria';
    return 'Dengue';
  },

  // =========================================================================
  // 1. Case Trend Over Time (Multi-Series Trendline for Dengue, Chikungunya, Malaria)
  // =========================================================================
  renderEpidemicCurve(patients, granularity = 'daily') {
    this.destroyChart('chart-epicurve');
    const ctx = document.getElementById('chart-epicurve')?.getContext('2d');
    if (!ctx) return;

    let labels = [];
    let xAxisTitle = '';
    const timeMap = {};

    if (granularity === 'daily') {
      xAxisTitle = 'Day of month';
      labels = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
      labels.forEach(l => {
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0 };
      });

      patients.forEach(p => {
        let dayNum = null;
        if (p.parsedDate) {
          const d = new Date(p.parsedDate);
          if (!isNaN(d.getTime())) dayNum = String(d.getDate());
        }
        if (!dayNum) dayNum = '1';

        const cat = this.getDiseaseCategory(p.disease);
        if (cat !== 'EXCLUDE' && timeMap[dayNum] && timeMap[dayNum][cat] !== undefined) {
          timeMap[dayNum][cat]++;
        }
      });
    } else if (granularity === 'monthly') {
      xAxisTitle = 'Month of year';
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels.forEach(l => {
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0 };
      });

      patients.forEach(p => {
        let mStr = p.month || 'Jan';
        const mIdx = labels.findIndex(m => mStr.toLowerCase().startsWith(m.toLowerCase()));
        const mKey = mIdx !== -1 ? labels[mIdx] : 'Jan';
        const cat = this.getDiseaseCategory(p.disease);
        if (cat !== 'EXCLUDE' && timeMap[mKey] && timeMap[mKey][cat] !== undefined) {
          timeMap[mKey][cat]++;
        }
      });
    } else { // yearly
      xAxisTitle = 'Year';
      const yearSet = new Set();
      patients.forEach(p => {
        const y = parseInt(p.year) || 2024;
        yearSet.add(`${y}`);
      });
      if (yearSet.size === 0) {
        yearSet.add('2024'); yearSet.add('2025'); yearSet.add('2026');
      }
      labels = Array.from(yearSet).sort();
      labels.forEach(l => {
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0 };
      });

      patients.forEach(p => {
        const yKey = `${parseInt(p.year) || 2024}`;
        const cat = this.getDiseaseCategory(p.disease);
        if (cat !== 'EXCLUDE' && timeMap[yKey] && timeMap[yKey][cat] !== undefined) {
          timeMap[yKey][cat]++;
        }
      });
    }

    const dengueData = labels.map(l => timeMap[l]['Dengue']);
    const chikData = labels.map(l => timeMap[l]['Chikungunya']);
    const malariaData = labels.map(l => timeMap[l]['Malaria']);

    this.charts['chart-epicurve'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Dengue',
            data: dengueData,
            borderColor: '#c8372d',
            backgroundColor: 'rgba(200, 55, 45, 0.15)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#c8372d'
          },
          {
            label: 'Chikungunya',
            data: chikData,
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230, 126, 34, 0.15)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#e67e22'
          },
          {
            label: 'Malaria',
            data: malariaData,
            borderColor: '#1e824c',
            backgroundColor: 'rgba(30, 130, 76, 0.15)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#1e824c'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: {
              display: true,
              text: xAxisTitle,
              color: '#94a3b8',
              font: { weight: '600', size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            title: {
              display: true,
              text: 'Case Count',
              color: '#94a3b8',
              font: { weight: '600', size: 11 }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              padding: 20,
              font: { size: 12, weight: '600' }
            }
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Total Cases: ${sum}`;
              }
            }
          }
        }
      }
    });
  },

  // 2. Demographic Risk Pyramid
  renderDemographicPyramid(patients) {
    this.destroyChart('chart-demographics');
    const ctx = document.getElementById('chart-demographics')?.getContext('2d');
    if (!ctx) return;

    const brackets = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70+'];
    const maleCounts = new Array(brackets.length).fill(0);
    const femaleCounts = new Array(brackets.length).fill(0);

    patients.forEach(p => {
      let bIdx = Math.floor(p.age / 10);
      if (bIdx >= 7) bIdx = 7;
      if (p.sex.toLowerCase().startsWith('m')) maleCounts[bIdx]++;
      else if (p.sex.toLowerCase().startsWith('f')) femaleCounts[bIdx]++;
    });

    const maleDiverging = maleCounts.map(c => -c);

    this.charts['chart-demographics'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: brackets,
        datasets: [
          { label: 'Male (Left Axis)', data: maleDiverging, backgroundColor: 'rgba(59, 130, 246, 0.85)', borderColor: '#3b82f6', borderRadius: 4 },
          { label: 'Female (Right Axis)', data: femaleCounts, backgroundColor: 'rgba(236, 72, 153, 0.85)', borderColor: '#ec4899', borderRadius: 4 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: false, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { callback: (val) => Math.abs(val) }, title: { display: true, text: '← Male Cases | Female Cases →', color: '#94a3b8', font: { weight: 'bold', size: 11 } } },
          y: { grid: { display: false }, title: { display: true, text: 'Age Brackets (Years)', color: '#94a3b8', font: { weight: 'bold', size: 11 } } }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: { callbacks: { label: (item) => `${item.dataset.label.split(' ')[0]}: ${Math.abs(item.raw)} cases` } }
        }
      }
    });
  },

  // 3. Facility Burden
  renderFacilityBurden(patients) {
    this.destroyChart('chart-facilities');
    const ctx = document.getElementById('chart-facilities')?.getContext('2d');
    if (!ctx) return;

    const hospMap = {};
    patients.forEach(p => {
      const hosp = p.hospital || 'Unspecified';
      const cat = this.getDiseaseCategory(p.disease);
      if (!hospMap[hosp]) hospMap[hosp] = { Dengue: 0, Chikungunya: 0, Malaria: 0, Total: 0 };
      if (cat !== 'EXCLUDE' && hospMap[hosp][cat] !== undefined) {
        hospMap[hosp][cat]++;
        hospMap[hosp].Total++;
      }
    });

    const sorted = Object.entries(hospMap).sort((a, b) => b[1].Total - a[1].Total).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const dengueData = sorted.map(s => s[1].Dengue);
    const chikData = sorted.map(s => s[1].Chikungunya);
    const malariaData = sorted.map(s => s[1].Malaria);

    this.charts['chart-facilities'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Dengue', data: dengueData, backgroundColor: '#c8372d', borderRadius: 4 },
          { label: 'Chikungunya', data: chikData, backgroundColor: '#e67e22', borderRadius: 4 },
          { label: 'Malaria', data: malariaData, backgroundColor: '#1e824c', borderRadius: 4 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Total Reported Cases', color: '#94a3b8' } },
          y: { stacked: true, grid: { display: false } }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
  },

  // 4. Zone & Prabhag Case Distribution Stacked Bar Chart
  renderZonePrabhagDistribution(patients) {
    this.destroyChart('chart-zones');
    const ctx = document.getElementById('chart-zones')?.getContext('2d');
    if (!ctx) return;

    const zones = Array.from({ length: 10 }, (_, i) => `Zone ${i + 1}`);

    const zoneMap = {};
    zones.forEach(z => zoneMap[z] = {});

    const globalPrabhagCounts = {};

    patients.forEach(p => {
      const zKey = `Zone ${p.zoneNum || 10}`;
      let prabRaw = p.prabhag ? String(p.prabhag).trim() : 'Unspecified';
      if (!prabRaw.toLowerCase().includes('prabhag') && prabRaw !== 'Unspecified') {
        prabRaw = `Prabhag ${prabRaw}`;
      }

      if (!zoneMap[zKey]) zoneMap[zKey] = {};
      zoneMap[zKey][prabRaw] = (zoneMap[zKey][prabRaw] || 0) + 1;
      globalPrabhagCounts[prabRaw] = (globalPrabhagCounts[prabRaw] || 0) + 1;
    });

    const topPrabhags = Object.entries(globalPrabhagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(entry => entry[0]);

    const palette = [
      '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b',
      '#ef4444', '#06b6d4', '#6366f1', '#14b8a6'
    ];

    const datasets = [];

    topPrabhags.forEach((pName, idx) => {
      const data = zones.map(z => zoneMap[z][pName] || 0);
      datasets.push({
        label: pName,
        data: data,
        backgroundColor: palette[idx % palette.length],
        borderRadius: 3
      });
    });

    const otherData = zones.map(z => {
      let otherSum = 0;
      Object.entries(zoneMap[z] || {}).forEach(([pName, cnt]) => {
        if (!topPrabhags.includes(pName)) otherSum += cnt;
      });
      return otherSum;
    });

    if (otherData.some(v => v > 0)) {
      datasets.push({
        label: 'Other Prabhags',
        data: otherData,
        backgroundColor: '#64748b',
        borderRadius: 3
      });
    }

    const prabhagBarLabelsPlugin = {
      id: 'prabhagBarLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (meta.hidden) return;

          meta.data.forEach((element, index) => {
            const val = dataset.data[index];
            if (val && val > 0) {
              const barY = element.y;
              const barBase = element.base;
              const segmentHeight = Math.abs(barBase - barY);

              if (segmentHeight > 10) {
                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(val, element.x, barY + (barBase - barY) / 2);
                ctx.restore();
              }
            }
          });
        });
      }
    };

    this.charts['chart-zones'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: zones,
        datasets: datasets
      },
      plugins: [prabhagBarLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'NMC Municipal Zones (Zones 1 - 10)', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
            title: { display: true, text: 'Notified Cases Count', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8, padding: 12, font: { size: 11, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Total Zone Cases: ${sum}`;
              }
            }
          }
        }
      }
    });
  },

  // 5. High Risk Correlation
  renderHighRiskCorrelation(patients) {
    this.destroyChart('chart-highrisk');
    const ctx = document.getElementById('chart-highrisk')?.getContext('2d');
    if (!ctx) return;

    let matched = 0, nonMatched = 0;
    patients.forEach(p => {
      if (p.isHighRiskMatch) matched++;
      else nonMatched++;
    });

    this.charts['chart-highrisk'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sheet 2 High-Risk Hotspot Match', 'Other City Locality'],
        datasets: [{
          data: [matched, nonMatched],
          backgroundColor: ['#c8372d', '#1e824c'],
          borderColor: ['#b02a21', '#145a32'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        cutout: '65%'
      }
    });
  },

  // 6. Age Group Susceptibility
  renderAgeDiseaseVulnerability(patients) {
    this.destroyChart('chart-vulnerability');
    const ctx = document.getElementById('chart-vulnerability')?.getContext('2d');
    if (!ctx) return;

    const ageGroups = ['Pediatric (<15)', 'Youth (15-34)', 'Adult (35-59)', 'Elderly (60+)'];
    const chikData = [0, 0, 0, 0];
    const dengData = [0, 0, 0, 0];
    const malariaData = [0, 0, 0, 0];

    patients.forEach(p => {
      const idx = ageGroups.indexOf(p.ageGroup);
      if (idx !== -1) {
        const cat = this.getDiseaseCategory(p.disease);
        if (cat === 'Chikungunya') chikData[idx]++;
        else if (cat === 'Dengue') dengData[idx]++;
        else if (cat === 'Malaria') malariaData[idx]++;
      }
    });

    this.charts['chart-vulnerability'] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ageGroups,
        datasets: [
          { label: 'Dengue', data: dengData, backgroundColor: 'rgba(200, 55, 45, 0.25)', borderColor: '#c8372d' },
          { label: 'Chikungunya', data: chikData, backgroundColor: 'rgba(230, 126, 34, 0.25)', borderColor: '#e67e22' },
          { label: 'Malaria', data: malariaData, backgroundColor: 'rgba(30, 130, 76, 0.25)', borderColor: '#1e824c' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
  }
};
