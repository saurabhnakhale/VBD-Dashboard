/**
 * ChartManager.js - Manages Chart.js visualizations & Zone x Prabhag Case Density Hotspot Matrix.
 */

const ChartManager = {
  charts: {},
  currentPatients: [],
  currentFullGranularity: 'daily',
  currentZoneView: 'zone', // 'zone' or 'prabhag'
  selectedZoneForPrabhag: 'ALL', // 'ALL' or '1'..'10'

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
    this.renderFullEpidemicCurve(patients, this.currentFullGranularity);
    this.renderDemographicPyramid(patients);
    this.renderFacilityBurden(patients);
    this.renderZonePrabhagDistribution(patients);
    this.renderHighRiskCorrelation(patients);
    this.setupGranularityListeners();
    this.setupZoneChartControls();
  },

  destroyChart(id) {
    if (this.charts[id]) {
      this.charts[id].destroy();
      delete this.charts[id];
    }
  },

  setupGranularityListeners() {
    const fullContainer = document.getElementById('epicurve-full-granularity-toggle');
    if (fullContainer && !fullContainer.dataset.initialized) {
      fullContainer.dataset.initialized = 'true';
      fullContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.pill-btn') || e.target.closest('.btn-granularity');
        if (!btn) return;

        fullContainer.querySelectorAll('.pill-btn, .btn-granularity').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const gran = btn.dataset.granularity || 'daily';
        this.currentFullGranularity = gran;
        this.renderFullEpidemicCurve(this.currentPatients, gran);
      });
    }
  },

  setupZoneChartControls() {
    const btnZoneView = document.getElementById('btn-view-zone');
    const btnPrabhagView = document.getElementById('btn-view-prabhag');
    const dropdownZone = document.getElementById('zone-select-dropdown');
    const btnBack = document.getElementById('btn-back-to-zones');

    if (btnZoneView && !btnZoneView.dataset.bound) {
      btnZoneView.dataset.bound = 'true';
      btnZoneView.addEventListener('click', () => {
        this.currentZoneView = 'zone';
        this.selectedZoneForPrabhag = 'ALL';
        if (dropdownZone) dropdownZone.value = 'ALL';
        this.updateZoneControlsUI();
        this.renderZonePrabhagDistribution(this.currentPatients);
      });
    }

    if (btnPrabhagView && !btnPrabhagView.dataset.bound) {
      btnPrabhagView.dataset.bound = 'true';
      btnPrabhagView.addEventListener('click', () => {
        this.currentZoneView = 'prabhag';
        this.updateZoneControlsUI();
        this.renderZonePrabhagDistribution(this.currentPatients);
      });
    }

    if (dropdownZone && !dropdownZone.dataset.bound) {
      dropdownZone.dataset.bound = 'true';
      dropdownZone.addEventListener('change', (e) => {
        const val = e.target.value;
        this.selectedZoneForPrabhag = val;
        if (val !== 'ALL') {
          this.currentZoneView = 'prabhag';
        }
        this.updateZoneControlsUI();
        this.renderZonePrabhagDistribution(this.currentPatients);
      });
    }

    if (btnBack && !btnBack.dataset.bound) {
      btnBack.dataset.bound = 'true';
      btnBack.addEventListener('click', () => {
        this.currentZoneView = 'zone';
        this.selectedZoneForPrabhag = 'ALL';
        if (dropdownZone) dropdownZone.value = 'ALL';
        this.updateZoneControlsUI();
        this.renderZonePrabhagDistribution(this.currentPatients);
      });
    }
  },

  updateZoneControlsUI() {
    const btnZoneView = document.getElementById('btn-view-zone');
    const btnPrabhagView = document.getElementById('btn-view-prabhag');
    const dropdownZone = document.getElementById('zone-select-dropdown');
    const btnBack = document.getElementById('btn-back-to-zones');

    if (btnZoneView && btnPrabhagView) {
      if (this.currentZoneView === 'zone') {
        btnZoneView.classList.add('active');
        btnPrabhagView.classList.remove('active');
      } else {
        btnPrabhagView.classList.add('active');
        btnZoneView.classList.remove('active');
      }
    }

    if (dropdownZone) {
      dropdownZone.value = this.selectedZoneForPrabhag;
    }

    if (btnBack) {
      btnBack.style.display = this.currentZoneView === 'prabhag' ? 'inline-flex' : 'none';
    }
  },

  getDiseaseCategory(disStr) {
    const d = (disStr || '').toLowerCase();
    if (d.includes('chikungunya') || d.includes('chikun')) return 'Chikungunya';
    if (d.includes('malaria')) return 'Malaria';
    if (d.includes('japanese') || d.includes('encephalitis') || d.includes('je') || d.includes('scrub')) return 'JE_Other';
    return 'Dengue';
  },

  // 1. Epidemic Curve & Temporal Surge
  renderFullEpidemicCurve(patients, granularity = 'daily') {
    this.destroyChart('chart-epicurve-full');
    const ctx = document.getElementById('chart-epicurve-full')?.getContext('2d');
    if (!ctx) return;

    const diseaseList = [
      { key: 'Dengue', label: 'Dengue Surge', color: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.2)' },
      { key: 'Chikungunya', label: 'Chikungunya Surge', color: '#ec4899', fill: 'rgba(236, 72, 153, 0.2)' },
      { key: 'Malaria', label: 'Malaria Surge', color: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)' },
      { key: 'JE', label: 'Japanese Encephalitis (JE)', color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)' },
      { key: 'Scrub Typhus', label: 'Scrub Typhus', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)' }
    ];

    const getDateKey = (p) => {
      let d = p.dateObj || (p.parsedDate ? new Date(p.parsedDate) : null);
      if (!d || isNaN(d.getTime())) return null;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      if (granularity === 'daily') {
        return `${yyyy}-${mm}-${dd}`;
      } else if (granularity === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const mYyyy = mon.getFullYear();
        const mMm = String(mon.getMonth() + 1).padStart(2, '0');
        const mDd = String(mon.getDate()).padStart(2, '0');
        return `${mYyyy}-${mMm}-${mDd}`;
      } else if (granularity === 'monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[d.getMonth()]} ${yyyy}`;
      } else { // yearly
        return `${yyyy}`;
      }
    };

    const dateMap = {};
    patients.forEach(p => {
      const key = getDateKey(p);
      if (key && !dateMap[key]) {
        dateMap[key] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE: 0, 'Scrub Typhus': 0 };
      }
    });

    const timeLabels = Object.keys(dateMap).sort();

    patients.forEach(p => {
      const key = getDateKey(p);
      if (key && dateMap[key]) {
        const dStr = (p.disease || '').toLowerCase();
        if (dStr.includes('chikungunya') || dStr.includes('chikun')) dateMap[key]['Chikungunya']++;
        else if (dStr.includes('malaria')) dateMap[key]['Malaria']++;
        else if (dStr.includes('japanese') || dStr.includes('encephalitis') || dStr.includes('je')) dateMap[key]['JE']++;
        else if (dStr.includes('scrub') || dStr.includes('typhus')) dateMap[key]['Scrub Typhus']++;
        else dateMap[key]['Dengue']++;
      }
    });

    const datasets = diseaseList.map(dis => {
      const data = timeLabels.map(t => dateMap[t][dis.key]);
      return {
        label: dis.label,
        data: data,
        borderColor: dis.color,
        backgroundColor: dis.fill,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: timeLabels.length > 60 ? 0 : 3,
        pointHoverRadius: 6
      };
    });

    this.charts['chart-epicurve-full'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: `Timeline (${granularity.toUpperCase()})`, color: '#94a3b8', font: { weight: '600', size: 11 } },
            ticks: { maxTicksLimit: 14, color: '#94a3b8' }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            title: { display: true, text: 'Notified Cases Count', color: '#94a3b8', font: { weight: '600', size: 11 } },
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 10, padding: 16, font: { size: 12, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              footer: (items) => {
                let sum = 0;
                items.forEach(i => sum += i.raw);
                return `Total Notified Cases: ${sum}`;
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
      if (!hospMap[hosp]) hospMap[hosp] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE_Other: 0, Total: 0 };
      if (hospMap[hosp][cat] !== undefined) {
        hospMap[hosp][cat]++;
        hospMap[hosp].Total++;
      }
    });

    const sorted = Object.entries(hospMap).sort((a, b) => b[1].Total - a[1].Total).slice(0, 8);
    const labels = sorted.map(s => s[0]);
    const dengueData = sorted.map(s => s[1].Dengue);
    const chikData = sorted.map(s => s[1].Chikungunya);
    const malariaData = sorted.map(s => s[1].Malaria);
    const jeData = sorted.map(s => s[1].JE_Other);

    this.charts['chart-facilities'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Dengue', data: dengueData, backgroundColor: '#a855f7', borderRadius: 4 },
          { label: 'Chikungunya', data: chikData, backgroundColor: '#ec4899', borderRadius: 4 },
          { label: 'Malaria', data: malariaData, backgroundColor: '#06b6d4', borderRadius: 4 },
          { label: 'JE / Others', data: jeData, backgroundColor: '#f59e0b', borderRadius: 4 }
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

  // 4. Interactive Zone & Prabhag Case Distribution
  renderZonePrabhagDistribution(patients) {
    this.destroyChart('chart-zones');
    const canvas = document.getElementById('chart-zones');
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    this.updateZoneControlsUI();

    const titleElem = document.getElementById('zone-chart-title');
    const subtitleElem = document.getElementById('zone-chart-subtitle');

    const diseaseCategories = [
      { key: 'Dengue', label: 'Dengue', color: '#a855f7' },
      { key: 'Chikungunya', label: 'Chikungunya', color: '#ec4899' },
      { key: 'Malaria', label: 'Malaria', color: '#06b6d4' },
      { key: 'JE_Other', label: 'JE / Others', color: '#f59e0b' }
    ];

    const classifyDisease = (disStr) => {
      const d = (disStr || '').toLowerCase();
      if (d.includes('chikungunya') || d.includes('chikun')) return 'Chikungunya';
      if (d.includes('malaria')) return 'Malaria';
      if (d.includes('dengue')) return 'Dengue';
      return 'JE_Other';
    };

    if (this.currentZoneView === 'zone') {
      if (titleElem) titleElem.textContent = '4. Zone & Prabhag Case Distribution';
      if (subtitleElem) subtitleElem.textContent = 'Stacked disease breakdown across NMC Municipal Zones 1–10 (Click any Zone bar to drill down into Prabhags)';

      const zones = Array.from({ length: 10 }, (_, i) => `Zone ${i + 1}`);

      const zoneDataMap = {};
      zones.forEach(z => {
        zoneDataMap[z] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE_Other: 0, total: 0 };
      });

      patients.forEach(p => {
        const zKey = `Zone ${p.zoneNum || 10}`;
        const cat = classifyDisease(p.disease);
        if (zoneDataMap[zKey]) {
          zoneDataMap[zKey][cat]++;
          zoneDataMap[zKey].total++;
        }
      });

      const datasets = diseaseCategories.map(cat => {
        return {
          label: cat.label,
          data: zones.map(z => zoneDataMap[z][cat.key]),
          backgroundColor: cat.color,
          borderRadius: 4
        };
      });

      const inlineBarLabelsPlugin = {
        id: 'zoneBarLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const totalsPerX = new Array(chart.data.labels.length).fill(0);
          const topYPerX = new Array(chart.data.labels.length).fill(9999);

          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden) return;

            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val && val > 0) {
                totalsPerX[index] += val;
                if (element.y < topYPerX[index]) {
                  topYPerX[index] = element.y;
                }

                const barY = element.y;
                const barBase = element.base;
                const segmentHeight = Math.abs(barBase - barY);

                if (segmentHeight > 6) {
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

          chart.data.labels.forEach((label, index) => {
            const totalVal = totalsPerX[index];
            const topY = topYPerX[index];
            if (totalVal > 0 && topY < 9999) {
              const meta = chart.getDatasetMeta(0);
              if (meta.data[index]) {
                const posX = meta.data[index].x;
                ctx.save();
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(totalVal, posX, topY - 4);
                ctx.restore();
              }
            }
          });
        }
      };

      this.charts['chart-zones'] = new Chart(ctx, {
        type: 'bar',
        data: { labels: zones, datasets: datasets },
        plugins: [inlineBarLabelsPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (e, elements) => {
            if (elements && elements.length > 0) {
              const idx = elements[0].index;
              const selectedZoneNum = idx + 1;
              this.selectedZoneForPrabhag = String(selectedZoneNum);
              this.currentZoneView = 'prabhag';
              this.renderZonePrabhagDistribution(this.currentPatients);
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' },
              title: { display: true, text: 'NMC Municipal Zones (Zones 1 - 10) • Click any bar to drill down into Prabhags', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
            },
            y: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' },
              beginAtZero: true,
              title: { display: true, text: 'Notified Cases Count', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#f8fafc', font: { size: 12, weight: 'bold' } }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                title: (items) => `Nagpur Municipal ${items[0].label}`,
                label: (item) => {
                  const zKey = item.label;
                  const total = zoneDataMap[zKey]?.total || 1;
                  const val = item.raw;
                  const pct = ((val / total) * 100).toFixed(1);
                  return `${item.dataset.label}: ${val} cases (${pct}% of zone total)`;
                },
                footer: (tooltipItems) => {
                  let total = 0;
                  tooltipItems.forEach((item) => { total += item.raw; });
                  return `Total Zone Cases: ${total}`;
                }
              }
            }
          }
        }
      });

    } else {
      const isAll = this.selectedZoneForPrabhag === 'ALL';
      const zoneFilterVal = isAll ? null : parseInt(this.selectedZoneForPrabhag, 10);
      const selectedZoneName = isAll ? 'All City Zones' : `Zone ${this.selectedZoneForPrabhag}`;

      if (titleElem) titleElem.textContent = `4. ${selectedZoneName} Prabhag-Wise Case Breakdown`;
      if (subtitleElem) subtitleElem.textContent = `Stacked disease distribution across Prabhags in ${selectedZoneName}`;

      const filteredZonePatients = isAll 
        ? patients 
        : patients.filter(p => p.zoneNum === zoneFilterVal);

      const prabhagDataMap = {};

      filteredZonePatients.forEach(p => {
        let prabRaw = p.prabhag ? String(p.prabhag).trim() : 'Unspecified';
        if (!prabRaw.toLowerCase().includes('prabhag') && prabRaw !== 'Unspecified') {
          prabRaw = `Prabhag ${prabRaw}`;
        }

        if (!prabhagDataMap[prabRaw]) {
          prabhagDataMap[prabRaw] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE_Other: 0, total: 0 };
        }

        const cat = classifyDisease(p.disease);
        prabhagDataMap[prabRaw][cat]++;
        prabhagDataMap[prabRaw].total++;
      });

      const prabhagLabels = Object.keys(prabhagDataMap)
        .sort((a, b) => prabhagDataMap[b].total - prabhagDataMap[a].total)
        .slice(0, isAll ? 12 : 25);

      if (prabhagLabels.length === 0) {
        prabhagLabels.push('No Data Available');
        prabhagDataMap['No Data Available'] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE_Other: 0, total: 0 };
      }

      const datasets = diseaseCategories.map(cat => {
        return {
          label: cat.label,
          data: prabhagLabels.map(p => prabhagDataMap[p][cat.key]),
          backgroundColor: cat.color,
          borderRadius: 4
        };
      });

      const inlineBarLabelsPlugin = {
        id: 'prabhagBarLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const totalsPerX = new Array(chart.data.labels.length).fill(0);
          const topYPerX = new Array(chart.data.labels.length).fill(9999);

          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta.hidden) return;

            meta.data.forEach((element, index) => {
              const val = dataset.data[index];
              if (val && val > 0) {
                totalsPerX[index] += val;
                if (element.y < topYPerX[index]) {
                  topYPerX[index] = element.y;
                }

                const barY = element.y;
                const barBase = element.base;
                const segmentHeight = Math.abs(barBase - barY);

                if (segmentHeight > 6) {
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

          chart.data.labels.forEach((label, index) => {
            const totalVal = totalsPerX[index];
            const topY = topYPerX[index];
            if (totalVal > 0 && topY < 9999) {
              const meta = chart.getDatasetMeta(0);
              if (meta.data[index]) {
                const posX = meta.data[index].x;
                ctx.save();
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(totalVal, posX, topY - 4);
                ctx.restore();
              }
            }
          });
        }
      };

      this.charts['chart-zones'] = new Chart(ctx, {
        type: 'bar',
        data: { labels: prabhagLabels, datasets: datasets },
        plugins: [inlineBarLabelsPlugin],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' },
              title: { display: true, text: `Prabhags (${selectedZoneName})`, color: '#94a3b8', font: { weight: 'bold', size: 11 } }
            },
            y: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' },
              beginAtZero: true,
              title: { display: true, text: 'Notified Cases Count', color: '#94a3b8', font: { weight: 'bold', size: 11 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#f8fafc', font: { size: 12, weight: 'bold' } }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                title: (items) => `${items[0].label} (${selectedZoneName})`,
                label: (item) => {
                  const prabName = item.label;
                  const total = prabhagDataMap[prabName]?.total || 1;
                  const val = item.raw;
                  const pct = ((val / total) * 100).toFixed(1);
                  return `${item.dataset.label}: ${val} cases (${pct}% of prabhag total)`;
                },
                footer: (tooltipItems) => {
                  let total = 0;
                  tooltipItems.forEach((item) => { total += item.raw; });
                  return `Total Prabhag Cases: ${total}`;
                }
              }
            }
          }
        }
      });
    }
  },

  // =========================================================================
  // 5. UPGRADED MULTI-DIMENSIONAL HOTSPOT MAP — ZONE × PRABHAG CASE DENSITY (MINI-DONUT CELL BUBBLES)
  // =========================================================================
  rebuildZonePrabhagMatrix(dataset) {
    const container = document.getElementById('hotspot-matrix-container') || document.querySelector('.hotspot-matrix-wrapper') || document.getElementById('zone-prabhag-heatmap-container');
    if (!container || !dataset || !Array.isArray(dataset)) return;

    // 1. Process and Aggregate Data Safely
    const matrix = {};
    const prabhagSet = new Set();
    const zonesList = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9', 'Zone 10'];

    dataset.forEach(row => {
      const rawZone = row.Zone || row.zone || row['Zone Name'] || row.zoneName || (row.zoneNum ? `Zone ${row.zoneNum}` : 'Zone 1');
      let rawPrabhag = row.Prabhag || row.prabhag || row['Prabhag No'] || row.prabhag_no || 'P0';
      
      // Normalize Prabhag name (e.g., "16" -> "P16")
      if (!rawPrabhag.toString().startsWith('P') && rawPrabhag !== 'P0') {
        rawPrabhag = `P${rawPrabhag}`;
      }

      prabhagSet.add(rawPrabhag);

      const disease = (row.Disease || row.disease || '').toString().toLowerCase();

      if (!matrix[rawZone]) matrix[rawZone] = {};
      if (!matrix[rawZone][rawPrabhag]) {
        matrix[rawZone][rawPrabhag] = { dengue: 0, chikungunya: 0, malaria: 0, total: 0 };
      }

      if (disease.includes('dengue')) matrix[rawZone][rawPrabhag].dengue++;
      else if (disease.includes('chikungunya') || disease.includes('chikun')) matrix[rawZone][rawPrabhag].chikungunya++;
      else if (disease.includes('malaria')) matrix[rawZone][rawPrabhag].malaria++;

      matrix[rawZone][rawPrabhag].total++;
    });

    const sortedPrabhags = Array.from(prabhagSet).sort((a, b) => {
      return parseInt(a.replace('P', '')) - parseInt(b.replace('P', ''));
    });

    // 2. Build HTML Table
    let tableHTML = `
      <div style="overflow-x: auto; width: 100%; background: #0b1120; border-radius: 8px; border: 1px solid #1e293b;">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; color: #f8fafc;">
          <thead>
            <tr style="background: #1e293b; color: #94a3b8;">
              <th style="padding: 8px; border: 1px solid #334155;">Zone \\ Prabhag</th>
              ${sortedPrabhags.map(p => `<th style="padding: 8px; border: 1px solid #334155;">${p}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    zonesList.forEach(zone => {
      tableHTML += `<tr><td style="padding: 6px; font-weight: bold; background: #0f172a; border: 1px solid #1e293b; color: #cbd5e1;">${zone}</td>`;
      
      sortedPrabhags.forEach(p => {
        const cell = matrix[zone] && matrix[zone][p];
        if (cell && cell.total > 0) {
          let cellText = [];
          if (cell.dengue > 0) cellText.push(`<span style="color:#a855f7; font-weight:bold;">${cell.dengue}D</span>`);
          if (cell.chikungunya > 0) cellText.push(`<span style="color:#ec4899; font-weight:bold;">${cell.chikungunya}C</span>`);
          if (cell.malaria > 0) cellText.push(`<span style="color:#06b6d4; font-weight:bold;">${cell.malaria}M</span>`);

          tableHTML += `<td class="cell-active" style="padding: 6px; border: 1px solid #1e293b; background: #131d31;">
                          ${cellText.join(' ')}
                        </td>`;
        } else {
          tableHTML += `<td style="padding: 6px; border: 1px solid #1e293b; color: #334155;">-</td>`;
        }
      });

      tableHTML += `</tr>`;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; color: #94a3b8;">
        <div>Legend: <span style="color:#a855f7;">● Dengue (D)</span> | <span style="color:#ec4899;">● Chikungunya (C)</span> | <span style="color:#06b6d4;">● Malaria (M)</span></div>
        <div style="font-weight: bold; color: #ffffff;">Total Cases Displayed: ${dataset.length}</div>
      </div>
    `;

    container.innerHTML = tableHTML;
  },

  renderHighRiskCorrelation(patients) {
    const container = document.getElementById('zone-prabhag-heatmap-container');
    if (!container) return;

    // 1. Collect all unique Prabhag numbers from patient linelist
    const prabhagSet = new Set();
    patients.forEach(p => {
      if (p.prabhag) {
        const pNum = parseInt(p.prabhag, 10);
        if (!isNaN(pNum)) prabhagSet.add(pNum);
      }
    });

    let sortedPrabhags = Array.from(prabhagSet).sort((a, b) => a - b);
    if (sortedPrabhags.length === 0) {
      sortedPrabhags = [0, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 23, 25, 26, 31, 33, 34, 35, 36, 37, 38];
    }

    // 2. Initialize 2D Matrix (Zones 1-10 x Prabhags) with disease-specific objects
    const matrix = {};
    const zoneTotals = {};
    for (let z = 1; z <= 10; z++) {
      matrix[z] = {};
      zoneTotals[z] = 0;
      sortedPrabhags.forEach(p => {
        matrix[z][p] = { Dengue: 0, Chikungunya: 0, Malaria: 0, JE_Other: 0, Total: 0 };
      });
    }

    patients.forEach(p => {
      const z = p.zoneNum || 10;
      const prab = p.prabhag ? parseInt(p.prabhag, 10) : null;
      if (z >= 1 && z <= 10 && prab !== null && matrix[z][prab]) {
        const dStr = (p.disease || '').toLowerCase();
        if (dStr.includes('chikun')) matrix[z][prab].Chikungunya++;
        else if (dStr.includes('malaria')) matrix[z][prab].Malaria++;
        else if (dStr.includes('japanese') || dStr.includes('encephalitis') || dStr.includes('je') || dStr.includes('scrub') || dStr.includes('typhus')) matrix[z][prab].JE_Other++;
        else matrix[z][prab].Dengue++;

        matrix[z][prab].Total++;
        zoneTotals[z]++;
      }
    });

    let grandTotal = 0;
    Object.values(zoneTotals).forEach(t => grandTotal += t);

    // Helper function to render a mini-pie / donut bubble cell
    const renderCellBubble = (cellData, zoneNum, prabhagNum) => {
      const { Dengue, Chikungunya, Malaria, JE_Other, Total } = cellData;
      if (Total === 0) {
        return `<td style="padding: 6px 2px; color: rgba(255,255,255,0.1); font-size: 0.65rem;">·</td>`;
      }

      // Proportions for conic-gradient pie slices
      const pDengue = (Dengue / Total) * 100;
      const pChik = (Chikungunya / Total) * 100;
      const pMalaria = (Malaria / Total) * 100;
      const pJe = (JE_Other / Total) * 100;

      const deg1 = pDengue;
      const deg2 = deg1 + pChik;
      const deg3 = deg2 + pMalaria;

      // CSS conic-gradient string
      let conicBg = '';
      if (pDengue === 100) conicBg = '#a855f7';
      else if (pChik === 100) conicBg = '#ec4899';
      else if (pMalaria === 100) conicBg = '#06b6d4';
      else if (pJe === 100) conicBg = '#f59e0b';
      else {
        conicBg = `conic-gradient(#a855f7 0% ${deg1}%, #ec4899 ${deg1}% ${deg2}%, #06b6d4 ${deg2}% ${deg3}%, #f59e0b ${deg3}% 100%)`;
      }

      // Bubble diameter scaling based on case density
      let size = 22;
      if (Total >= 6) size = 36;
      else if (Total >= 4) size = 32;
      else if (Total >= 3) size = 28;
      else if (Total >= 2) size = 25;

      const innerSize = Math.max(12, size - 8);

      const tooltipText = `Zone ${zoneNum}, Prabhag P${prabhagNum}&#10;Total: ${Total} cases&#10;• 🦟 Dengue: ${Dengue}&#10;• 🦠 Chikungunya: ${Chikungunya}&#10;• 🔬 Malaria: ${Malaria}&#10;• 🐛 Scrub Typhus / JE: ${JE_Other}`;

      return `
        <td title="${tooltipText}" style="padding: 4px 2px; vertical-align: middle; text-align: center;">
          <div style="
            width: ${size}px;
            height: ${size}px;
            margin: 0 auto;
            border-radius: 50%;
            background: ${conicBg};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.6);
            cursor: pointer;
            transition: transform 0.15s ease;
          " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1.0)'">
            <div style="
              width: ${innerSize}px;
              height: ${innerSize}px;
              border-radius: 50%;
              background: #0b1120;
              color: #ffffff;
              font-weight: 900;
              font-size: ${Total >= 10 ? '9px' : '10px'};
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${Total}
            </div>
          </div>
        </td>
      `;
    };

    // 3. Build Table HTML
    let tableHtml = `
      <div style="overflow-x: auto; max-width: 100%; max-height: 350px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 2px; font-size: 0.75rem; text-align: center; color: #f8fafc;">
          <thead>
            <tr style="position: sticky; top: 0; z-index: 4; background: #0b1120;">
              <th style="padding: 7px 10px; color: #94a3b8; text-align: left; position: sticky; left: 0; background: #0b1120; z-index: 5; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); min-width: 90px;">Zone \\ Prabhag</th>
    `;

    sortedPrabhags.forEach(p => {
      tableHtml += `<th style="padding: 7px 4px; color: #94a3b8; font-weight: 700; min-width: 32px; border-bottom: 1px solid rgba(255,255,255,0.1);">P${p}</th>`;
    });

    tableHtml += `
              <th style="padding: 7px 10px; color: #f8fafc; background: #1e1b4b; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.1); min-width: 75px;">Zone Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (let z = 1; z <= 10; z++) {
      tableHtml += `<tr>`;
      tableHtml += `<td style="padding: 6px 10px; text-align: left; font-weight: 700; color: #f8fafc; position: sticky; left: 0; background: #0b1120; z-index: 3; border-right: 1px solid rgba(255,255,255,0.05); white-space: nowrap;">Zone ${z}</td>`;

      sortedPrabhags.forEach(p => {
        tableHtml += renderCellBubble(matrix[z][p], z, p);
      });

      tableHtml += `<td style="padding: 6px 10px; font-weight: 800; color: #a855f7; background: rgba(30, 27, 75, 0.75); border-radius: 4px;">${zoneTotals[z]}</td>`;
      tableHtml += `</tr>`;
    }

    tableHtml += `
          </tbody>
        </table>
      </div>

      <!-- Disease & Density Legend Header -->
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-top: 10px; padding: 8px 12px; font-size: 0.75rem; color: #94a3b8; background: rgba(15, 23, 42, 0.7); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); gap: 10px;">
        
        <!-- Disease Proportions Legend -->
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-weight: 700; color: #f8fafc;">Mini-Pie Disease Breakdown:</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #a855f7;"></span> 🦟 Dengue</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #ec4899;"></span> 🦠 Chikungunya</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #06b6d4;"></span> 🔬 Malaria</span>
          <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span> 🐛 Scrub Typhus / JE</span>
        </div>

        <!-- Bubble Size Density Scale -->
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; color: #f8fafc;">Density Scale:</span>
          <span style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem;"><span style="width: 14px; height: 14px; border-radius: 50%; background: #a855f7; display: inline-block;"></span> 1-2 Cases</span>
          <span style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem;"><span style="width: 18px; height: 18px; border-radius: 50%; background: #a855f7; display: inline-block;"></span> 3-5 Cases</span>
          <span style="display: flex; align-items: center; gap: 4px; font-size: 0.7rem;"><span style="width: 22px; height: 22px; border-radius: 50%; background: #a855f7; display: inline-block;"></span> 6+ Cases</span>
        </div>

        <div style="font-weight: 700; color: #f8fafc;">
          Total Cases: <span style="color: #a855f7;">${grandTotal}</span>
        </div>

      </div>
    `;

    container.innerHTML = tableHtml;
  }
};
