/**
 * ChartManager.js - Manages Iwosan-style Chart.js visualizations
 */

const ChartManager = {
  charts: {},

  init() {
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.borderRadius = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(11, 16, 38, 0.95)';
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
  },

  renderAll(patients) {
    this.init();
    this.renderDiagnosticsDonut(patients);
    this.renderDemographicsDonut(patients);
    this.renderHealthSparkline(patients);
    this.renderMonthlyStackedBar(patients);
    this.renderVulnerabilityRadar(patients);
    this.renderHighRiskDoughnut(patients);
  },

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  },

  // 1. Diagnostics Outbreak Donut (Chikungunya, Dengue, Other)
  renderDiagnosticsDonut(patients) {
    this.destroyChart('chart-donut-diagnostics');
    const ctx = document.getElementById('chart-donut-diagnostics')?.getContext('2d');
    if (!ctx) return;

    let chik = 0, deng = 0, other = 0;
    patients.forEach(p => {
      if (p.disease.includes('Chikungunya')) chik++;
      else if (p.disease.includes('Dengue')) deng++;
      else other++;
    });

    const total = chik + deng + other;
    const totalElem = document.getElementById('donut-total-cases');
    if (totalElem) totalElem.textContent = total.toLocaleString();

    this.charts['chart-donut-diagnostics'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Chikungunya', 'Dengue', 'Others'],
        datasets: [{
          data: [chik, deng, other],
          backgroundColor: ['#ff2a5f', '#2563eb', '#ffb703'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  },

  // 2. Patient Demographics Donut (Men vs Women vs Children)
  renderDemographicsDonut(patients) {
    this.destroyChart('chart-donut-demographics');
    const ctx = document.getElementById('chart-donut-demographics')?.getContext('2d');
    if (!ctx) return;

    let men = 0, women = 0, children = 0;
    patients.forEach(p => {
      if (p.age < 15) children++;
      else if (p.sex.toLowerCase().startsWith('m')) men++;
      else women++;
    });

    this.charts['chart-donut-demographics'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['MEN', 'WOMEN', 'CHILDREN'],
        datasets: [{
          data: [men, women, children],
          backgroundColor: ['#2563eb', '#ff2a5f', '#00d2ff'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
  },

  // 3. Health Index Area Sparkline
  renderHealthSparkline(patients) {
    this.destroyChart('chart-sparkline-health');
    const ctx = document.getElementById('chart-sparkline-health')?.getContext('2d');
    if (!ctx) return;

    // Glowing pink area gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 100);
    grad.addColorStop(0, 'rgba(255, 42, 95, 0.45)');
    grad.addColorStop(1, 'rgba(255, 42, 95, 0.0)');

    const sparkData = [40, 55, 48, 65, 78, 85, 92];

    this.charts['chart-sparkline-health'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          data: sparkData,
          borderColor: '#ff2a5f',
          borderWidth: 3,
          backgroundColor: grad,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ff2a5f',
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { display: false }
        },
        plugins: { legend: { display: false } }
      }
    });
  },

  // 4. Overall Monthly Case Surge Stacked Bar
  renderMonthlyStackedBar(patients) {
    this.destroyChart('chart-stacked-monthly');
    const ctx = document.getElementById('chart-stacked-monthly')?.getContext('2d');
    if (!ctx) return;

    const months = ['June', 'July', 'August', 'September', 'October'];
    const chikCounts = [120, 240, 310, 180, 90];
    const dengCounts = [45, 95, 140, 85, 40];

    this.charts['chart-stacked-monthly'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [
          {
            label: 'Chikungunya',
            data: chikCounts,
            backgroundColor: '#ff2a5f',
            borderRadius: 4
          },
          {
            label: 'Dengue',
            data: dengCounts,
            backgroundColor: '#2563eb',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' } }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 8, font: { size: 9 } } }
        }
      }
    });
  },

  // 5. Causes & Age Vulnerability Radar
  renderVulnerabilityRadar(patients) {
    this.destroyChart('chart-radar-vulnerability');
    const ctx = document.getElementById('chart-radar-vulnerability')?.getContext('2d');
    if (!ctx) return;

    this.charts['chart-radar-vulnerability'] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Pediatric', 'Youth', 'Adult', 'Senior', 'UPHC Area', 'High Risk'],
        datasets: [
          {
            label: 'Chikungunya Risk',
            data: [80, 65, 90, 75, 85, 95],
            borderColor: '#ff2a5f',
            backgroundColor: 'rgba(255, 42, 95, 0.2)',
            pointBackgroundColor: '#ff2a5f',
            borderWidth: 2
          },
          {
            label: 'Dengue Risk',
            data: [60, 85, 70, 60, 75, 80],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            pointBackgroundColor: '#2563eb',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.08)' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' }
          }
        },
        plugins: { legend: { position: 'top', labels: { font: { size: 9 } } } }
      }
    });
  },

  // 6. Sheet 2 High Risk Area Match Doughnut
  renderHighRiskDoughnut(patients) {
    this.destroyChart('chart-highrisk-doughnut');
    const ctx = document.getElementById('chart-highrisk-doughnut')?.getContext('2d');
    if (!ctx) return;

    let matched = 0, nonMatched = 0;
    patients.forEach(p => {
      if (p.isHighRiskMatch) matched++;
      else nonMatched++;
    });

    this.charts['chart-highrisk-doughnut'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Sheet 2 High-Risk Match', 'Other City Area'],
        datasets: [{
          data: [matched, nonMatched],
          backgroundColor: ['#ff2a5f', '#2563eb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
      }
    });
  }
};
