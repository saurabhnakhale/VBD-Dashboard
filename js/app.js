/**
 * App.js - Application Main Controller
 * Handles global state, filter events, search, table pagination, CSV export, and theme toggling.
 */

const App = {
  allPatients: [],
  filteredPatients: [],
  highRiskAreas: [],
  
  // Table Pagination state
  currentPage: 1,
  pageSize: 15,

  async init() {
    console.log("[App] Starting Vector-Borne Disease Dashboard...");
    
    // Theme setup
    this.setupThemeToggle();

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

  setupThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      btn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    });
  },

  populateFilterDropdowns() {
    // 1. Diseases
    const diseaseSet = new Set(this.allPatients.map(p => p.disease).filter(Boolean));
    const diseaseSelect = document.getElementById('filter-disease');
    if (diseaseSelect) {
      diseaseSelect.innerHTML = '<option value="ALL">All Diseases</option>';
      diseaseSet.forEach(d => {
        diseaseSelect.innerHTML += `<option value="${d}">${d}</option>`;
      });
    }

    // 2. Zones
    const zoneSelect = document.getElementById('filter-zone');
    if (zoneSelect) {
      zoneSelect.innerHTML = '<option value="ALL">All Zones (1-10)</option>';
      for (let z = 1; z <= 10; z++) {
        const name = ZONE_MAP[z] || `Zone ${z}`;
        zoneSelect.innerHTML += `<option value="${z}">${name}</option>`;
      }
    }

    // 3. Prabhags
    this.updatePrabhagDropdown('ALL');

    // 4. Months
    const monthSet = new Set(this.allPatients.map(p => p.month).filter(Boolean));
    const monthSelect = document.getElementById('filter-month');
    if (monthSelect) {
      monthSelect.innerHTML = '<option value="ALL">All Months</option>';
      monthSet.forEach(m => {
        monthSelect.innerHTML += `<option value="${m}">${m}</option>`;
      });
    }
  },

  updatePrabhagDropdown(selectedZone) {
    const prabhagSelect = document.getElementById('filter-prabhag');
    if (!prabhagSelect) return;

    prabhagSelect.innerHTML = '<option value="ALL">All Prabhags</option>';

    let validPatients = this.allPatients;
    if (selectedZone !== 'ALL') {
      const zNum = parseInt(selectedZone, 10);
      validPatients = this.allPatients.filter(p => p.zoneNum === zNum);
    }

    const prabhagSet = new Set(validPatients.map(p => p.prabhagNum).filter(Boolean));
    const sortedPrabhags = Array.from(prabhagSet).sort((a, b) => a - b);

    sortedPrabhags.forEach(p => {
      prabhagSelect.innerHTML += `<option value="${p}">Prabhag ${p}</option>`;
    });
  },

  bindEvents() {
    // Slicer controls
    const searchInput = document.getElementById('filter-search');
    const diseaseSelect = document.getElementById('filter-disease');
    const zoneSelect = document.getElementById('filter-zone');
    const prabhagSelect = document.getElementById('filter-prabhag');
    const monthSelect = document.getElementById('filter-month');
    const ageSelect = document.getElementById('filter-age-group');
    const facilitySelect = document.getElementById('filter-facility');
    const resetBtn = document.getElementById('filter-reset-btn');
    const exportBtn = document.getElementById('btn-export-csv');

    if (searchInput) searchInput.addEventListener('input', () => this.applyFiltersAndRender());
    if (diseaseSelect) diseaseSelect.addEventListener('change', () => this.applyFiltersAndRender());
    
    if (zoneSelect) {
      zoneSelect.addEventListener('change', (e) => {
        this.updatePrabhagDropdown(e.target.value);
        this.applyFiltersAndRender();
      });
    }
    
    if (prabhagSelect) prabhagSelect.addEventListener('change', () => this.applyFiltersAndRender());
    if (monthSelect) monthSelect.addEventListener('change', () => this.applyFiltersAndRender());
    if (ageSelect) ageSelect.addEventListener('change', () => this.applyFiltersAndRender());
    if (facilitySelect) facilitySelect.addEventListener('change', () => this.applyFiltersAndRender());

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (diseaseSelect) diseaseSelect.value = 'ALL';
        if (zoneSelect) zoneSelect.value = 'ALL';
        this.updatePrabhagDropdown('ALL');
        if (monthSelect) monthSelect.value = 'ALL';
        if (ageSelect) ageSelect.value = 'ALL';
        if (facilitySelect) facilitySelect.value = 'ALL';
        this.applyFiltersAndRender();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportTableToCSV());
    }

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
    const diseaseVal = document.getElementById('filter-disease')?.value || 'ALL';
    const zoneVal = document.getElementById('filter-zone')?.value || 'ALL';
    const prabhagVal = document.getElementById('filter-prabhag')?.value || 'ALL';
    const monthVal = document.getElementById('filter-month')?.value || 'ALL';
    const ageVal = document.getElementById('filter-age-group')?.value || 'ALL';
    const facilityVal = document.getElementById('filter-facility')?.value || 'ALL';

    this.filteredPatients = this.allPatients.filter(p => {
      // Search term match
      if (searchVal) {
        const matchStr = `${p.name} ${p.address} ${p.hospital} ${p.disease} ${p.zoneName}`.toLowerCase();
        if (!matchStr.includes(searchVal)) return false;
      }

      // Disease match
      if (diseaseVal !== 'ALL' && p.disease !== diseaseVal) return false;

      // Zone match
      if (zoneVal !== 'ALL' && p.zoneNum !== parseInt(zoneVal, 10)) return false;

      // Prabhag match
      if (prabhagVal !== 'ALL' && p.prabhagNum !== parseInt(prabhagVal, 10)) return false;

      // Month match
      if (monthVal !== 'ALL' && p.month !== monthVal) return false;

      // Age group match
      if (ageVal !== 'ALL' && p.ageGroup !== ageVal) return false;

      // Facility type match
      if (facilityVal !== 'ALL' && p.facilityType !== facilityVal) return false;

      return true;
    });

    // Reset pagination to page 1
    this.currentPage = 1;

    // Trigger visual updates
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

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
