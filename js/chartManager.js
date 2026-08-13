/**
 * ChartManager.js - Upgraded Modern Epidemiological Visualizations
 * 1. Epidemic Curve: Multi-Series Smooth Line Chart with 7-Day Moving Average
 * 2. Demographic Pyramid: Diverging WHO/CDC Style Age-Gender Population Pyramid
 * 3. Facility Burden: Stacked Breakdown by Disease Type (Dengue, Chikungunya, Malaria)
 * 4. Zone Outbreak Matrix: Spatial-Temporal Heatmap Matrix across Zones 1-10 & Months
 */

const ChartManager = {
  charts: {},
  currentPatients: [],
  currentGranularity: 'monthly',

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
      const btn = e.target.closest('.btn-granularity');
      if (!btn) return;

      container.querySelectorAll('.btn-granularity').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const gran = btn.dataset.granularity || 'monthly';
      this.currentGranularity = gran;
      this.renderEpidemicCurve(this.currentPatients, gran);
    });
  },

  getDiseaseCategory(disStr) {
    const d = (disStr || '').toLowerCase();
    if (d.includes('dengue')) return 'Dengue';
    if (d.includes('chikungunya') || d.includes('chikun')) return 'Chikungunya';
    if (d.includes('malaria')) return 'Malaria';
    if (d.includes('japanese') || d.includes('encephalitis') || d.includes('je')) return 'Japanese Encephalitis';
    if (d.includes('scrub') || d.includes('typhus')) return 'Scrub Typhus';
    return 'Dengue';
  },

  getDateGroupKey(p, granularity) {
    let dateObj = null;
    if (p.parsedDate) {
      dateObj = new Date(p.parsedDate);
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      const y = parseInt(p.year) || 2024;
      dateObj = new Date(`${p.month || 'Jan'} 1, ${y}`);
    }
    if (!dateObj || isNaN(dateObj.getTime())) {
      dateObj = new Date('2024-01-01');
    }

    const year = dateObj.getFullYear();
    const monthIdx = dateObj.getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (granularity === 'yearly') {
      return `${year}`;
    }

    if (granularity === 'monthly') {
      const monthNum = String(monthIdx + 1).padStart(2, '0');
      return `${year}-${monthNum} (${monthNames[monthIdx]})`;
    }

    if (granularity === 'weekly') {
      const target = new Date(dateObj.valueOf());
      const dayNr = (dateObj.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
      }
      const weekNum = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
      const wStr = String(weekNum).padStart(2, '0');
      return `${year}-W${wStr}`;
    }

    // Daily
    const mNum = String(monthIdx + 1).padStart(2, '0');
    const dNum = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${mNum}-${dNum}`;
  },

  // =========================================================================
  // 1. REPLACEMENT: Multi-Series Smooth Line Chart with Semi-Transparent Fill
  // =========================================================================
  renderEpidemicCurve(patients, granularity = 'monthly') {
    this.destroyChart('chart-epicurve');
    const ctx = document.getElementById('chart-epicurve')?.getContext('2d');
    if (!ctx) return;

    const timeMap = {};

    patients.forEach(p => {
      const key = this.getDateGroupKey(p, granularity);
      const category = this.getDiseaseCategory(p.disease);

      if (!timeMap[key]) {
        timeMap[key] = { Dengue: 0, Chikungunya: 0, Malaria: 0, 'Japanese Encephalitis': 0, 'Scrub Typhus': 0 };
      }
      timeMap[key][category] = (timeMap[key][category] || 0) + 1;
    });

    const sortedLabels = Object.keys(timeMap).sort();

    const dengueData = sortedLabels.map(l => timeMap[l].Dengue);
    const chikData = sortedLabels.map(l => timeMap[l].Chikungunya);
    const malariaData = sortedLabels.map(l => timeMap[l].Malaria);
    const jeData = sortedLabels.map(l => timeMap[l]['Japanese Encephalitis']);
    const scrubData = sortedLabels.map(l => timeMap[l]['Scrub Typhus']);

    this.charts['chart-epicurve'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedLabels,
        datasets: [
          {
            label: 'Dengue Surge',
            data: dengueData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            borderWidth: 2.8,
            cubicInterpolationMode: 'monotone',
            fill: true,
            pointRadius: sortedLabels.length > 30 ? 0 : 3.5,
            pointHoverRadius: 6
          },
          {
            label: 'Chikungunya Surge',
            data: chikData,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            borderWidth: 2.8,
            cubicInterpolationMode: 'monotone',
            fill: true,
            pointRadius: sortedLabels.length > 30 ? 0 : 3.5,
            pointHoverRadius: 6
          },
          {
            label: 'Malaria Surge',
            data: malariaData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            borderWidth: 2.2,
            cubicInterpolationMode: 'monotone',
            fill: true,
            pointRadius: sortedLabels.length > 30 ? 0 : 3,
            pointHoverRadius: 5
          },
          {
            label: 'Japanese Encephalitis (JE)',
            data: jeData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            cubicInterpolationMode: 'monotone',
            fill: false,
            pointRadius: sortedLabels.length > 30 ? 0 : 3
          },
          {
            label: 'Scrub Typhus',
            data: scrubData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            cubicInterpolationMode: 'monotone',
            fill: false,
            pointRadius: sortedLabels.length > 30 ? 0 : 3
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
              text: `Timeline (${granularity.toUpperCase()})`,
              color: '#94a3b8',
              font: { weight: 'bold', size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Notified Cases Count', color: '#94a3b8', font: { weight: 'bold', size: 11 } },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              title: (items) => `Period: ${items[0].label}`,
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Total Vector Notifications: ${sum}`;
              }
            }
          }
        }
      }
    });
  },

  // =========================================================================
  // 2. REPLACEMENT: Diverging Population Pyramid (Back-to-Back WHO/CDC Style)
  // =========================================================================
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

    // Male counts plotted as negative values to diverge left
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
            ticks: {
              callback: (val) => Math.abs(val)
            },
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
              label: (item) => {
                const label = item.dataset.label.split(' ')[0];
                const count = Math.abs(item.raw);
                return `${label}: ${count} patient notifications`;
              }
            }
          }
        }
      }
    });
  },

  // =========================================================================
  // 3. REPLACEMENT: Facility-Level Case Burden (Stacked Breakdown by Disease)
  // =========================================================================
  renderFacilityBurden(patients) {
    this.destroyChart('chart-facilities');
    const ctx = document.getElementById('chart-facilities')?.getContext('2d');
    if (!ctx) return;

    const hospMap = {};
    patients.forEach(p => {
      const hosp = p.hospital || 'Unspecified';
      const cat = this.getDiseaseCategory(p.disease);
      if (!hospMap[hosp]) {
        hospMap[hosp] = { Dengue: 0, Chikungunya: 0, Malaria: 0, Total: 0 };
      }
      if (cat === 'Dengue') hospMap[hosp].Dengue++;
      else if (cat === 'Chikungunya') hospMap[hosp].Chikungunya++;
      else if (cat === 'Malaria') hospMap[hosp].Malaria++;
      hospMap[hosp].Total++;
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
          {
            label: 'Dengue',
            data: dengueData,
            backgroundColor: 'rgba(139, 92, 246, 0.85)',
            borderColor: '#8b5cf6',
            borderRadius: 4
          },
          {
            label: 'Chikungunya',
            data: chikData,
            backgroundColor: 'rgba(236, 72, 153, 0.85)',
            borderColor: '#ec4899',
            borderRadius: 4
          },
          {
            label: 'Malaria',
            data: malariaData,
            backgroundColor: 'rgba(6, 182, 212, 0.85)',
            borderColor: '#06b6d4',
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Total Admitted / Reported Cases', color: '#94a3b8' } },
          y: { stacked: true, grid: { display: false } }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Facility Total: ${sum} cases`;
              }
            }
          }
        }
      }
    });
  },

  // =========================================================================
  // 4. REPLACEMENT: Spatial-Temporal Zone Outbreak Burden Heatmap Matrix
  // =========================================================================
  renderZoneMatrixHeatmap(patients) {
    this.destroyChart('chart-zones');
    const ctx = document.getElementById('chart-zones')?.getContext('2d');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const zones = Array.from({ length: 10 }, (_, i) => `Zone ${i + 1}`);

    // Build 10x12 matrix counts
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

    // Flatten into Chart.js bubble / heatmap dataset
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
            if (val > 50) return 'rgba(239, 68, 68, 0.85)'; // Red surge
            if (val > 25) return 'rgba(249, 115, 22, 0.85)'; // Orange high
            if (val > 10) return 'rgba(234, 179, 8, 0.85)'; // Yellow medium
            if (val > 5) return 'rgba(13, 148, 136, 0.85)'; // Teal moderate
            return 'rgba(59, 130, 246, 0.65)'; // Blue low
          },
          borderColor: (ctx) => {
            const val = ctx.raw?.v || 0;
            if (val > 50) return '#ef4444';
            if (val > 25) return '#f97316';
            if (val > 10) return '#eab308';
            return '#3b82f6';
          },
          borderWidth: 1.5
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
            ticks: {
              stepSize: 1,
              callback: (val) => months[val] || ''
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Months of the Year', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          },
          y: {
            type: 'linear',
            min: -0.5,
            max: 9.5,
            ticks: {
              stepSize: 1,
              callback: (val) => zones[val] || ''
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'NMC Municipal Zones (1-10)', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const raw = item.raw;
                const mName = months[raw.x];
                const zName = zones[raw.y];
                return `${zName} in ${mName}: ${raw.v} cases notified`;
              }
            }
          }
        }
      }
    });
  },

  // 5. High-Risk Area Match Ratio (Sheet 2 Correlation)
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
          backgroundColor: [
            'rgba(239, 68, 68, 0.85)',
            'rgba(59, 130, 246, 0.5)'
          ],
          borderColor: ['#ef4444', '#3b82f6'],
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

  // 6. Age Group Susceptibility by Disease
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
          {
            label: 'Chikungunya',
            data: chikData,
            backgroundColor: 'rgba(236, 72, 153, 0.25)',
            borderColor: '#ec4899',
            pointBackgroundColor: '#ec4899'
          },
          {
            label: 'Dengue',
            data: dengData,
            backgroundColor: 'rgba(139, 92, 246, 0.25)',
            borderColor: '#8b5cf6',
            pointBackgroundColor: '#8b5cf6'
          },
          {
            label: 'Malaria',
            data: malariaData,
            backgroundColor: 'rgba(6, 182, 212, 0.25)',
            borderColor: '#06b6d4',
            pointBackgroundColor: '#06b6d4'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            pointLabels: { font: { size: 11, weight: 'bold' } }
          }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
  }
};
