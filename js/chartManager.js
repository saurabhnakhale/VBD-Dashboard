/**
 * ChartManager.js - Manages 6 advanced Chart.js visualizations for the dashboard.
 */

const ChartManager = {
  charts: {},

  init() {
    // Chart.js default styling overrides
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.borderRadius = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  },

  renderAll(patients) {
    this.init();
    this.renderEpidemicCurve(patients);
    this.renderDemographicPyramid(patients);
    this.renderFacilityBurden(patients);
    this.renderZoneHierarchy(patients);
    this.renderHighRiskCorrelation(patients);
    this.renderAgeDiseaseVulnerability(patients);
  },

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  },

  // 1. Epidemic Curve & Temporal Surge
  renderEpidemicCurve(patients) {
    this.destroyChart('chart-epicurve');
    const ctx = document.getElementById('chart-epicurve')?.getContext('2d');
    if (!ctx) return;

    // Group cases by Month/Date
    const datesMap = {};
    patients.forEach(p => {
      const key = p.parsedDate || `${p.month} ${p.year}`;
      if (!datesMap[key]) datesMap[key] = { Chikungunya: 0, Dengue: 0, Total: 0 };
      if (p.disease.includes('Chikungunya')) datesMap[key].Chikungunya++;
      else if (p.disease.includes('Dengue')) datesMap[key].Dengue++;
      datesMap[key].Total++;
    });

    const sortedLabels = Object.keys(datesMap).sort();
    const chikData = sortedLabels.map(l => datesMap[l].Chikungunya);
    const dengueData = sortedLabels.map(l => datesMap[l].Dengue);

    this.charts['chart-epicurve'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedLabels,
        datasets: [
          {
            label: 'Chikungunya',
            data: chikData,
            backgroundColor: 'rgba(236, 72, 153, 0.7)',
            borderColor: '#ec4899',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Dengue',
            data: dengueData,
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: '#8b5cf6',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Cases Notified' } }
        },
        plugins: {
          legend: { position: 'top' },
          title: { display: false }
        }
      }
    });
  },

  // 2. Demographic Risk Pyramid (Age Group vs Sex)
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
        plugins: {
          legend: { position: 'top' }
        }
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

    // Sort and get top 8 hospitals
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
        plugins: {
          legend: { display: false }
        }
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
        plugins: {
          legend: { display: false }
        }
      }
    });
  },

  // 5. High-Risk Area Match Ratio (Sheet 2 Correlation)
  renderHighRiskCorrelation(patients) {
    this.destroyChart('chart-highrisk');
    const ctx = document.getElementById('chart-highrisk')?.getContext('2d');
    if (!ctx) return;

    let matched = 0;
    let nonMatched = 0;

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
        plugins: {
          legend: { position: 'bottom' }
        },
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

    patients.forEach(p => {
      const idx = ageGroups.indexOf(p.ageGroup);
      if (idx !== -1) {
        if (p.disease.includes('Chikungunya')) chikData[idx]++;
        else if (p.disease.includes('Dengue')) dengData[idx]++;
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
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }
};
