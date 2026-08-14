// --- CUSTOM MULTI-SELECT DROPDOWN MANAGER ---
const MultiSelectManager = {
  instances: {},

  init(id, labelDefault, options, onChangeCallback) {
    const container = document.getElementById(id);
    if (!container) return;

    container.className = 'custom-multiselect filter-control';
    container.innerHTML = `
      <div class="multiselect-trigger">
        <span class="multiselect-text">${labelDefault}</span>
        <i class="fa-solid fa-chevron-down multiselect-caret"></i>
      </div>
      <div class="multiselect-dropdown">
        <div style="padding: 6px 12px; border-bottom: 1px solid #1e293b; background: #0f172a;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; color: #38bdf8; cursor: pointer; user-select: none;">
            <input type="checkbox" class="chk-select-all" checked style="accent-color: #3b82f6; width: 14px; height: 14px; cursor: pointer;">
            Select All
          </label>
        </div>
        <div class="multiselect-items-list"></div>
      </div>
    `;

    const trigger = container.querySelector('.multiselect-trigger');
    const chkSelectAll = container.querySelector('.chk-select-all');
    const itemsList = container.querySelector('.multiselect-items-list');

    this.instances[id] = {
      container,
      options,
      selected: ['ALL'],
      onChangeCallback,
      labelDefault
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-multiselect').forEach(el => {
        if (el !== container) el.classList.remove('open');
      });
      container.classList.toggle('open');
    });

    itemsList.innerHTML = options.map(opt => `
      <label class="multiselect-item">
        <input type="checkbox" value="${opt.value}" checked>
        <span>${opt.label}</span>
      </label>
    `).join('');

    const itemCheckboxes = itemsList.querySelectorAll('input[type="checkbox"]');

    chkSelectAll.addEventListener('change', () => {
      const isChecked = chkSelectAll.checked;
      itemCheckboxes.forEach(cb => cb.checked = isChecked);
      this.instances[id].selected = isChecked ? ['ALL'] : [];
      this.updateTriggerText(id);
      if (onChangeCallback) onChangeCallback(this.instances[id].selected);
    });

    itemCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedBoxes = Array.from(itemCheckboxes).filter(c => c.checked);
        if (checkedBoxes.length === itemCheckboxes.length) {
          chkSelectAll.checked = true;
          this.instances[id].selected = ['ALL'];
        } else {
          chkSelectAll.checked = false;
          this.instances[id].selected = checkedBoxes.map(c => c.value);
        }
        this.updateTriggerText(id);
        if (onChangeCallback) onChangeCallback(this.instances[id].selected);
      });
    });

    this.updateTriggerText(id);
  },

  updateTriggerText(id) {
    const inst = this.instances[id];
    if (!inst) return;
    const textSpan = inst.container.querySelector('.multiselect-text');
    const chkSelectAll = inst.container.querySelector('.chk-select-all');

    if (inst.selected.includes('ALL') || inst.selected.length === 0 || inst.selected.length === inst.options.length) {
      textSpan.textContent = inst.labelDefault;
      if (chkSelectAll) chkSelectAll.checked = true;
    } else if (inst.selected.length === 1) {
      const opt = inst.options.find(o => String(o.value) === String(inst.selected[0]));
      textSpan.textContent = opt ? opt.label : inst.selected[0];
    } else {
      textSpan.textContent = `${inst.selected.length} Selected`;
    }
  },

  getSelected(id) {
    return this.instances[id] ? this.instances[id].selected : ['ALL'];
  },

  reset(id) {
    const inst = this.instances[id];
    if (!inst) return;
    inst.selected = ['ALL'];
    const chkSelectAll = inst.container.querySelector('.chk-select-all');
    if (chkSelectAll) chkSelectAll.checked = true;
    const itemCheckboxes = inst.container.querySelectorAll('.multiselect-items-list input[type="checkbox"]');
    itemCheckboxes.forEach(cb => cb.checked = true);
    this.updateTriggerText(id);
  }
};

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-multiselect')) {
    document.querySelectorAll('.custom-multiselect').forEach(el => el.classList.remove('open'));
  }
});

const App = {
  allPatients: [],
  filteredPatients: [],
  highRiskAreas: [],
  
  currentPage: 1,
  pageSize: 15,

  async init() {
    console.log("[App] Starting Vector-Borne Disease Dashboard...");
    
    this.purgeLegacyContainers();
    this.setupLiveDate();

    try {
      const data = await DataLoader.init();
      this.allPatients = data.patients;
      this.highRiskAreas = data.highRiskAreas;
      this.filteredPatients = [...this.allPatients];

      this.populateFilterDropdowns();
      this.bindEvents();
      this.applyFiltersAndRender();

      console.log("[App] Dashboard successfully initialized!");
    } catch (err) {
      console.error("[App] Failed to initialize dashboard:", err);
    }
  },

  purgeLegacyContainers() {
    document.querySelectorAll('.hotspot-matrix-wrapper, #hotspot-matrix-container').forEach(el => el.remove());
    const legacyContainer = document.getElementById('zone-prabhag-heatmap-container');
    if (legacyContainer && !legacyContainer.querySelector('#topPrabhagsChart')) {
      legacyContainer.remove();
    }
  },

  setupLiveDate() {
    const dateElement = document.getElementById('current-date-text');
    if (!dateElement) return;

    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const todayStr = new Date().toLocaleDateString('en-GB', options);
    dateElement.textContent = todayStr;
  },

  populateFilterDropdowns() {
    // 1. Diseases
    const diseaseSet = new Set(this.allPatients.map(p => p.disease).filter(Boolean));
    const diseaseOptions = Array.from(diseaseSet).map(d => ({ value: d, label: d }));
    MultiSelectManager.init('filter-disease', 'All Diseases', diseaseOptions, () => this.applyFiltersAndRender());

    // 2. Zones
    const zoneOptions = [];
    for (let z = 1; z <= 10; z++) {
      const name = ZONE_MAP[z] || `Zone ${z}`;
      zoneOptions.push({ value: z, label: name });
    }
    MultiSelectManager.init('filter-zone', 'All Zones (1-10)', zoneOptions, () => this.applyFiltersAndRender());

    // 3. Months
    const monthSet = new Set(this.allPatients.map(p => p.month).filter(Boolean));
    const monthOptions = Array.from(monthSet).map(m => ({ value: m, label: m }));
    MultiSelectManager.init('filter-month', 'All Months', monthOptions, () => this.applyFiltersAndRender());

    // 4. Years
    const yearSet = new Set(this.allPatients.map(p => p.year).filter(Boolean));
    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    const yearOptions = sortedYears.map(y => ({ value: y, label: String(y) }));
    MultiSelectManager.init('filter-year', 'All Years', yearOptions, () => this.applyFiltersAndRender());

    // 5. Facility Type
    const facilityOptions = [
      { value: 'Urban Primary Health Center (UPHC)', label: 'Urban Primary Health Centers (UPHC)' },
      { value: 'Tertiary Government Hospital', label: 'Tertiary Government Hospitals' },
      { value: 'Private Hospital / Lab', label: 'Private Hospitals & Labs' }
    ];
    MultiSelectManager.init('filter-facility', 'All Facilities', facilityOptions, () => this.applyFiltersAndRender());
  },

  bindEvents() {
    const searchInput = document.getElementById('filter-search');
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const resetBtn = document.getElementById('filter-reset-btn');
    const exportBtn = document.getElementById('btn-export-csv');

    if (searchInput) searchInput.addEventListener('input', () => this.applyFiltersAndRender());
    if (startDateInput) startDateInput.addEventListener('change', () => this.applyFiltersAndRender());
    if (endDateInput) endDateInput.addEventListener('change', () => this.applyFiltersAndRender());

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        MultiSelectManager.reset('filter-disease');
        MultiSelectManager.reset('filter-zone');
        MultiSelectManager.reset('filter-month');
        MultiSelectManager.reset('filter-year');
        MultiSelectManager.reset('filter-facility');
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        this.applyFiltersAndRender();
      });
    }

    if (exportBtn) exportBtn.addEventListener('click', () => this.exportTableToCSV());

    // Pagination controls
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.filteredPatients.length / this.pageSize);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.renderTable();
        }
      });
    }
  },

  applyFiltersAndRender() {
    const searchVal = (document.getElementById('filter-search')?.value || '').toLowerCase().trim();
    const selectedDiseases = MultiSelectManager.getSelected('filter-disease');
    const selectedZones = MultiSelectManager.getSelected('filter-zone');
    const selectedMonths = MultiSelectManager.getSelected('filter-month');
    const selectedYears = MultiSelectManager.getSelected('filter-year');
    const startDateVal = document.getElementById('filter-start-date')?.value || '';
    const endDateVal = document.getElementById('filter-end-date')?.value || '';
    const selectedFacilities = MultiSelectManager.getSelected('filter-facility');

    const startTs = startDateVal ? new Date(startDateVal).getTime() : null;
    const endTs = endDateVal ? new Date(endDateVal + 'T23:59:59').getTime() : null;

    this.filteredPatients = this.allPatients.filter(p => {
      // 1. Search (Patient's Name, Hospital, Address ONLY)
      if (searchVal) {
        const nameMatch = (p.name || '').toLowerCase().includes(searchVal);
        const hospMatch = (p.hospital || '').toLowerCase().includes(searchVal);
        const addrMatch = (p.address || '').toLowerCase().includes(searchVal);

        if (!nameMatch && !hospMatch && !addrMatch) return false;
      }

      // 2. Disease Multi-Select Filter
      if (!selectedDiseases.includes('ALL') && selectedDiseases.length > 0) {
        if (!selectedDiseases.includes(p.disease)) return false;
      }

      // 3. Zone Multi-Select Filter
      if (!selectedZones.includes('ALL') && selectedZones.length > 0) {
        if (!selectedZones.map(Number).includes(p.zoneNum)) return false;
      }

      // 4. Month Multi-Select Filter
      if (!selectedMonths.includes('ALL') && selectedMonths.length > 0) {
        if (!selectedMonths.includes(p.month)) return false;
      }

      // 5. Year Multi-Select Filter
      if (!selectedYears.includes('ALL') && selectedYears.length > 0) {
        if (!selectedYears.map(String).includes(String(p.year))) return false;
      }

      // 6. Date Selector (Timeline Calendar Range)
      if (startTs || endTs) {
        let pTs = null;
        if (p.dateObj && !isNaN(p.dateObj.getTime())) {
          pTs = p.dateObj.getTime();
        } else if (p.parsedDate) {
          pTs = new Date(p.parsedDate).getTime();
        }

        if (pTs) {
          if (startTs && pTs < startTs) return false;
          if (endTs && pTs > endTs) return false;
        }
      }

      // 7. Facility Type Multi-Select Filter
      if (!selectedFacilities.includes('ALL') && selectedFacilities.length > 0) {
        if (!selectedFacilities.includes(p.facilityType)) return false;
      }

      return true;
    });

    this.currentPage = 1;

    KPIManager.update(this.filteredPatients, this.allPatients.length);
    ChartManager.renderAll(this.filteredPatients);
    HeatmapManager.render(this.filteredPatients);
    MapManager.render(this.filteredPatients, this.highRiskAreas);
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('table-body');
    const pageInfo = document.getElementById('table-page-info');
    const countInfo = document.getElementById('table-count-info');
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');

    if (!tbody) return;

    const total = this.filteredPatients.length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;

    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const pageData = this.filteredPatients.slice(startIdx, endIdx);

    let html = '';
    pageData.forEach(p => {
      let diseaseClass = 'tag-other';
      if (p.disease.includes('Chikungunya')) diseaseClass = 'tag-chikungunya';
      else if (p.disease.includes('Dengue')) diseaseClass = 'tag-dengue';

      const highRiskBadge = p.isHighRiskMatch 
        ? `<span title="Matched Sheet 2 High Risk Area: ${p.matchedHighRiskLocality}" style="color: #ef4444; font-weight: bold;"><i class="fa-solid fa-triangle-exclamation"></i> High Risk</span>` 
        : `<span style="color: var(--text-muted);">Standard</span>`;

      html += `
        <tr>
          <td>#${p.id}</td>
          <td>${p.month} ${p.year}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.address}</td>
          <td>${p.age}</td>
          <td>${p.sex}</td>
          <td><span class="disease-tag ${diseaseClass}">${p.disease}</span></td>
          <td>${p.hospital}</td>
          <td>${p.rawDate || '-'}</td>
          <td>Zone ${p.zoneNum}</td>
          <td>Prabhag ${p.prabhagNum}</td>
          <td>${highRiskBadge}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html || `<tr><td colspan="12" style="text-align:center; padding: 2rem; color: var(--text-muted);">No records found matching current slicers.</td></tr>`;

    if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    if (countInfo) countInfo.textContent = `Showing ${startIdx + (total > 0 ? 1 : 0)}-${endIdx} of ${total} records`;

    if (prevBtn) prevBtn.disabled = this.currentPage === 1;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
  },

  exportTableToCSV() {
    if (!this.filteredPatients || this.filteredPatients.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Sr No", "Month", "Year", "Patient Name", "Address", "Age", "Sex",
      "Disease", "Hospital Name", "Notification Date", "Zone", "Prabhag", "Sheet 2 High Risk Match"
    ];

    const rows = this.filteredPatients.map(p => [
      p.id, p.month, p.year, `"${p.name.replace(/"/g, '""')}"`, `"${p.address.replace(/"/g, '""')}"`,
      p.age, p.sex, p.disease, `"${p.hospital.replace(/"/g, '""')}"`, p.rawDate, p.zoneNum, p.prabhagNum,
      p.isHighRiskMatch ? "Yes" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vbd_linelist_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
