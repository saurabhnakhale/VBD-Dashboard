/**
 * ChartManager.js - Manages 6 advanced Chart.js visualizations for the dashboard.
 * Includes multi-disease trendline (Daily, Weekly, Monthly, Yearly) for all 5 diseases.
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
    this.renderZoneHierarchy(patients);
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

      const gran = btn.dataset.granularity || 'daily';
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

  // 1. Epidemic Curve & 5-Disease Trendlines (Daily, Weekly, Monthly, Yearly)
  renderEpidemicCurve(patients, granularity = 'daily') {
    this.destroyChart('chart-epicurve');
    const ctx = document.getElementById('chart-epicurve')?.getContext('2d');
    if (!ctx) return;

    const diseases = ['Dengue', 'Chikungunya', 'Malaria', 'Japanese Encephalitis', 'Scrub Typhus'];
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
            label: 'Dengue',
            data: dengueData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: sortedLabels.length > 50 ? 0 : 3,
            pointHoverRadius: 6
          },
          {
            label: 'Chikungunya',
            data: chikData,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: sortedLabels.length > 50 ? 0 : 3,
            pointHoverRadius: 6
          },
          {
            label: 'Malaria',
            data: malariaData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: false,
            pointRadius: sortedLabels.length > 50 ? 0 : 3,
            pointHoverRadius: 6
          },
          {
            label: 'Japanese Encephalitis (JE)',
            data: jeData,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: false,
            pointRadius: sortedLabels.length > 50 ? 0 : 3,
            pointHoverRadius: 6
          },
          {
            label: 'Scrub Typhus',
            data: scrubData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            fill: false,
            pointRadius: sortedLabels.length > 50 ? 0 : 3,
            pointHoverRadius: 6
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
              text: `Time Breakdown (${granularity.toUpperCase()})`,
              color: '#94a3b8',
              font: { weight: 'bold', size: 11 }
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Cases Notified', color: '#94a3b8', font: { weight: 'bold', size: 11 } },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
              padding: 15,
              font: { size: 11, weight: '600' }
            }
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

    this.charts['chart-demographics'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: brackets,
        datasets: [
          {
            label: 'Male',
            data: maleCounts,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: '#3b82f6',
            borderRadius: 4
          },
          {
            label: 'Female',
            data: femaleCounts,
            backgroundColor: 'rgba(236, 72, 153, 0.8)',
            borderColor: '#ec4899',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Age Brackets (Years)' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Patient Count' } }
        },
        plugins: { legend: { position: 'top' } }
      }
    });
  },

  // 3. Facility-Level Case Burden Distribution
  renderFacilityBurden(patients) {
    this.destroyChart('chart-facilities');
    const ctx = document.getElementById('chart-facilities')?.getContext('2d');
    if (!ctx) return;

    const hospMap = {};
    patients.forEach(p => {
      const hosp = p.hospital || 'Unspecified';
      hospMap[hosp] = (hospMap[hosp] || 0) + 1;
    });

    const sorted = Object.entries(hospMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);

    this.charts['chart-facilities'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Notifications',
          data: data,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  },

  // 4. Zone & Prabhag Hierarchical Distribution
  renderZoneHierarchy(patients) {
    this.destroyChart('chart-zones');
    const ctx = document.getElementById('chart-zones')?.getContext('2d');
    if (!ctx) return;

    const zoneCounts = {};
    for (let i = 1; i <= 10; i++) zoneCounts[`Zone ${i}`] = 0;

    patients.forEach(p => {
      const key = `Zone ${p.zoneNum || 10}`;
      zoneCounts[key] = (zoneCounts[key] || 0) + 1;
    });

    const labels = Object.keys(zoneCounts);
    const data = Object.values(zoneCounts);

    this.charts['chart-zones'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Cases',
          data: data,
          backgroundColor: 'rgba(99, 102, 241, 0.8)',
          borderColor: '#6366f1',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: { legend: { display: false } }
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
