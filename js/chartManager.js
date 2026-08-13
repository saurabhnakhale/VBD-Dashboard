/**
 * ChartManager.js - Manages 6 advanced Chart.js visualizations for the dashboard.
 * Includes "Case Trend Over Time" stacked bar chart matching user reference image.
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
    this.renderZoneMatrixHeatmap(patients);
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
    if (d.includes('chikungunya') || d.includes('chikun')) return 'Chikungunya';
    if (d.includes('malaria')) return 'Malaria';
    if (d.includes('positive') || d.includes('scrub') || d.includes('japanese') || d.includes('encephalitis') || d.includes('je')) {
      return 'Dengue (Positive)';
    }
    return 'Dengue'; // Default
  },

  // =========================================================================
  // 1. Case Trend Over Time (Stacked Bar Chart matching user reference image)
  // =========================================================================
  renderEpidemicCurve(patients, granularity = 'daily') {
    this.destroyChart('chart-epicurve');
    const ctx = document.getElementById('chart-epicurve')?.getContext('2d');
    if (!ctx) return;

    let labels = [];
    let xAxisTitle = '';
    const categories = ['Dengue', 'Chikungunya', 'Malaria', 'Dengue (Positive)'];

    // Map structure: { labelKey: { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Dengue (Positive)': 0 } }
    const timeMap = {};

    if (granularity === 'daily') {
      xAxisTitle = 'Day of month';
      labels = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
      labels.forEach(l => {
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Dengue (Positive)': 0 };
      });

      patients.forEach(p => {
        let dayNum = null;
        if (p.parsedDate) {
          const d = new Date(p.parsedDate);
          if (!isNaN(d.getTime())) dayNum = String(d.getDate());
        }
        if (!dayNum) dayNum = '1';

        const cat = this.getDiseaseCategory(p.disease);
        if (timeMap[dayNum]) {
          timeMap[dayNum][cat] = (timeMap[dayNum][cat] || 0) + 1;
        }
      });
    } else if (granularity === 'monthly') {
      xAxisTitle = 'Month of year';
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      labels.forEach(l => {
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Dengue (Positive)': 0 };
      });

      patients.forEach(p => {
        let mStr = p.month || 'Jan';
        const mIdx = labels.findIndex(m => mStr.toLowerCase().startsWith(m.toLowerCase()));
        const mKey = mIdx !== -1 ? labels[mIdx] : 'Jan';
        const cat = this.getDiseaseCategory(p.disease);
        timeMap[mKey][cat] = (timeMap[mKey][cat] || 0) + 1;
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
        timeMap[l] = { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Dengue (Positive)': 0 };
      });

      patients.forEach(p => {
        const yKey = `${parseInt(p.year) || 2024}`;
        const cat = this.getDiseaseCategory(p.disease);
        if (timeMap[yKey]) {
          timeMap[yKey][cat] = (timeMap[yKey][cat] || 0) + 1;
        }
      });
    }

    const dengueData = labels.map(l => timeMap[l]['Dengue']);
    const chikData = labels.map(l => timeMap[l]['Chikungunya']);
    const malariaData = labels.map(l => timeMap[l]['Malaria']);
    const denguePosData = labels.map(l => timeMap[l]['Dengue (Positive)']);

    // Inline DataLabels Plugin to draw segment numerical counts inside bars
    const inlineBarLabelsPlugin = {
      id: 'inlineBarLabels',
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

    this.charts['chart-epicurve'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Dengue',
            data: dengueData,
            backgroundColor: '#c8372d',
            borderColor: '#b02a21',
            borderWidth: 1,
            borderRadius: 2
          },
          {
            label: 'Chikungunya',
            data: chikData,
            backgroundColor: '#e67e22',
            borderColor: '#d35400',
            borderWidth: 1,
            borderRadius: 2
          },
          {
            label: 'Malaria',
            data: malariaData,
            backgroundColor: '#1e824c',
            borderColor: '#145a32',
            borderWidth: 1,
            borderRadius: 2
          },
          {
            label: 'Dengue (Positive)',
            data: denguePosData,
            backgroundColor: '#7b241c',
            borderColor: '#641e16',
            borderWidth: 1,
            borderRadius: 2
          }
        ]
      },
      plugins: [inlineBarLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: {
              display: true,
              text: xAxisTitle,
              color: '#94a3b8',
              font: { weight: '600', size: 11 }
            }
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: false,
              boxWidth: 14,
              boxHeight: 14,
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

  // 2. Demographic Risk Pyramid (Back-to-Back Population Pyramid)
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
          {
            label: 'Male (Left Axis)',
            data: maleDiverging,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'Female (Right Axis)',
            data: femaleCounts,
            backgroundColor: 'rgba(236, 72, 153, 0.85)',
            borderColor: '#ec4899',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: false,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { callback: (val) => Math.abs(val) },
            title: { display: true, text: '← Male Cases | Female Cases →', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          },
          y: {
            grid: { display: false },
            title: { display: true, text: 'Age Brackets (Years)', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label.split(' ')[0]}: ${Math.abs(item.raw)} cases`
            }
          }
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
      if (!hospMap[hosp]) hospMap[hosp] = { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Dengue (Positive)': 0, Total: 0 };
      hospMap[hosp][cat] = (hospMap[hosp][cat] || 0) + 1;
      hospMap[hosp].Total++;
    });

    const sorted = Object.entries(hospMap).sort((a, b) => b[1].Total - a[1].Total).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const dengueData = sorted.map(s => s[1].Dengue);
    const chikData = sorted.map(s => s[1].Chikungunya);
    const malariaData = sorted.map(s => s[1].Malaria);
    const posData = sorted.map(s => s[1]['Dengue (Positive)']);

    this.charts['chart-facilities'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Dengue', data: dengueData, backgroundColor: '#c8372d', borderRadius: 4 },
          { label: 'Chikungunya', data: chikData, backgroundColor: '#e67e22', borderRadius: 4 },
          { label: 'Malaria', data: malariaData, backgroundColor: '#1e824c', borderRadius: 4 },
          { label: 'Dengue (Positive)', data: posData, backgroundColor: '#7b241c', borderRadius: 4 }
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

  // 4. Spatial-Temporal Zone Outbreak Burden Matrix
  renderZoneMatrixHeatmap(patients) {
    this.destroyChart('chart-zones');
    const ctx = document.getElementById('chart-zones')?.getContext('2d');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const zones = Array.from({ length: 10 }, (_, i) => `Zone ${i + 1}`);

    const matrix = {};
    zones.forEach(z => {
      matrix[z] = {};
      months.forEach(m => matrix[z][m] = 0);
    });

    patients.forEach(p => {
      const zKey = `Zone ${p.zoneNum || 10}`;
      let mStr = p.month || 'Jan';
      const mIdx = months.findIndex(m => mStr.toLowerCase().startsWith(m.toLowerCase()));
      const mKey = mIdx !== -1 ? months[mIdx] : 'Jan';
      if (matrix[zKey] && matrix[zKey][mKey] !== undefined) {
        matrix[zKey][mKey]++;
      }
    });

    const bubbleData = [];
    zones.forEach((z, zIdx) => {
      months.forEach((m, mIdx) => {
        const val = matrix[z][m];
        if (val > 0) {
          bubbleData.push({
            x: mIdx,
            y: zIdx,
            r: Math.min(Math.max(val * 1.4, 4), 16),
            v: val
          });
        }
      });
    });

    this.charts['chart-zones'] = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Outbreak Intensity',
          data: bubbleData,
          backgroundColor: (ctx) => {
            const val = ctx.raw?.v || 0;
            if (val > 50) return 'rgba(200, 55, 45, 0.85)';
            if (val > 25) return 'rgba(230, 126, 34, 0.85)';
            if (val > 10) return 'rgba(241, 196, 15, 0.85)';
            return 'rgba(30, 130, 76, 0.75)';
          },
          borderColor: '#ffffff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: -0.5,
            max: 11.5,
            ticks: { stepSize: 1, callback: (val) => months[val] || '' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Months of the Year', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          },
          y: {
            type: 'linear',
            min: -0.5,
            max: 9.5,
            ticks: { stepSize: 1, callback: (val) => zones[val] || '' },
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'NMC Municipal Zones (1-10)', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `${zones[item.raw.y]} in ${months[item.raw.x]}: ${item.raw.v} cases`
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
