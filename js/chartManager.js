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
      let d = null;
      if (p.dateObj && !isNaN(p.dateObj.getTime())) {
        d = new Date(p.dateObj.getTime());
      } else if (p.parsedDate) {
        const parsed = new Date(p.parsedDate);
        if (!isNaN(parsed.getTime())) d = parsed;
      }

      if (granularity === 'yearly') {
        if (d) return String(d.getFullYear());
        if (p.year) return String(p.year);
        return null;
      }

      if (granularity === 'monthly') {
        if (d) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        }
        if (p.month && p.year) {
          const mStr = p.month.charAt(0).toUpperCase() + p.month.slice(1).toLowerCase();
          return `${mStr} ${p.year}`;
        }
        return null;
      }

      if (granularity === 'weekly') {
        if (!d) return null;
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.getFullYear(), d.getMonth(), diff);
        const mYyyy = mon.getFullYear();
        const mMm = String(mon.getMonth() + 1).padStart(2, '0');
        const mDd = String(mon.getDate()).padStart(2, '0');
        return `${mYyyy}-${mMm}-${mDd}`;
      }

      // daily
      if (!d) return null;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
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
      if (titleElem) titleElem.textContent = '4. Zone & Prabhag Wise Case Distribution';
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
  // 5. TOP 10 HOTSPOT PRABHAGS (ZONE-WISE BREAKDOWN)
  // =========================================================================

  renderHighRiskCorrelation(patients) {
    const zoneSelect = document.getElementById('top-prabhags-zone-filter');
    const selectedZone = zoneSelect ? zoneSelect.value : 'ALL';

    if (zoneSelect && !zoneSelect.dataset.listenerAttached) {
      zoneSelect.addEventListener('change', (e) => {
        renderTop10PrabhagsChart(this.lastPatients || patients, e.target.value);
      });
      zoneSelect.dataset.listenerAttached = 'true';
    }

    this.lastPatients = patients;
    renderTop10PrabhagsChart(patients, selectedZone);
  }
};

// --- 1. RENDER TOP 10 HOTSPOT PRABHAGS (STACKED BAR) ---
function renderTop10PrabhagsChart(records, selectedZone = 'ALL') {
  if (!records || !Array.isArray(records)) return;

  const prabhagMap = {};

  records.forEach(row => {
    let rawZone = row.Zone || row.zone || row['Zone Name'] || row.zoneName || (row.zoneNum ? `Zone ${row.zoneNum}` : 'Zone 1');
    let zNum = parseInt(rawZone.toString().replace(/[^0-9]/g, ''), 10);
    if (isNaN(zNum) || zNum < 1 || zNum > 10) zNum = 1;
    const zoneStr = `Zone ${zNum}`;

    if (selectedZone !== 'ALL') {
      const targetNum = parseInt(selectedZone.toString().replace(/[^0-9]/g, ''), 10);
      if (!isNaN(targetNum) && zNum !== targetNum) return;
    }

    let prabhag = row.Prabhag || row.prabhag || row.prabhag_no || row.prabhagNum || 'P0';
    let pStr = prabhag.toString().trim();
    if (!pStr.startsWith('P') && pStr !== 'P0') pStr = `P${pStr}`;

    const key = `${pStr} (${zoneStr})`;
    const disease = (row.Disease || row.disease || '').toLowerCase();

    if (!prabhagMap[key]) {
      prabhagMap[key] = { label: key, total: 0, dengue: 0, chikungunya: 0, malaria: 0, other: 0 };
    }

    prabhagMap[key].total++;
    if (disease.includes('dengue')) prabhagMap[key].dengue++;
    else if (disease.includes('chikungunya') || disease.includes('chikun')) prabhagMap[key].chikungunya++;
    else if (disease.includes('malaria')) prabhagMap[key].malaria++;
    else prabhagMap[key].other++;
  });

  // Sort descending and get top 10
  const top10 = Object.values(prabhagMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const canvas = document.getElementById('topPrabhagsChart') || document.getElementById('chart-top-prabhags');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window.topPrabhagsChartInstance) window.topPrabhagsChartInstance.destroy();
  if (ChartManager && ChartManager.charts && ChartManager.charts['topPrabhagsChart']) {
    ChartManager.charts['topPrabhagsChart'].destroy();
  }

  window.topPrabhagsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(item => item.label),
      datasets: [
        { label: 'Dengue', data: top10.map(i => i.dengue), backgroundColor: '#a855f7', borderColor: '#9333ea', borderWidth: 1, borderRadius: 4 },
        { label: 'Chikungunya', data: top10.map(i => i.chikungunya), backgroundColor: '#ec4899', borderColor: '#db2777', borderWidth: 1, borderRadius: 4 },
        { label: 'Malaria', data: top10.map(i => i.malaria), backgroundColor: '#06b6d4', borderColor: '#0891b2', borderWidth: 1, borderRadius: 4 },
        { label: 'Others / Scrub', data: top10.map(i => i.other), backgroundColor: '#f59e0b', borderColor: '#d97706', borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', precision: 0 } },
        y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#cbd5e1', font: { weight: 'bold' } } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle' } },
        tooltip: {
          callbacks: {
            afterBody: (items) => {
              const idx = items[0].dataIndex;
              const item = top10[idx];
              return `Total Case Burden: ${item.total} cases`;
            }
          }
        }
      }
    }
  });

  const footerElem = document.getElementById('top-prabhags-count-footer');
  if (footerElem) {
    footerElem.textContent = `Total Active Prabhags Tracked: ${Object.keys(prabhagMap).length}`;
  }
}
