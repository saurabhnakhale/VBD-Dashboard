/**
 * KPIManager.js - Calculates and renders 5 core healthcare KPIs for the dashboard.
 */

const KPIManager = {
  update(filteredPatients, totalPatientsCount) {
    if (!filteredPatients) return;

    const total = filteredPatients.length;
    const overallTotal = totalPatientsCount || total;

    // KPI 1: Total Notified Cases
    const totalElem = document.getElementById('kpi-total-cases');
    const totalSubElem = document.getElementById('kpi-total-subtext');
    if (totalElem) totalElem.textContent = total.toLocaleString();
    if (totalSubElem) {
      const pctOfOverall = overallTotal > 0 ? ((total / overallTotal) * 100).toFixed(1) : 100;
      totalSubElem.innerHTML = `<span class="kpi-badge badge-neutral">${pctOfOverall}% of database</span> Filtered patient count`;
    }

    // KPI 2: Dominant Disease Spectrum Ratio
    const diseaseCounts = {};
    filteredPatients.forEach(p => {
      diseaseCounts[p.disease] = (diseaseCounts[p.disease] || 0) + 1;
    });
    
    let dominantDisease = 'N/A';
    let dominantCount = 0;
    Object.entries(diseaseCounts).forEach(([dis, count]) => {
      if (count > dominantCount) {
        dominantCount = count;
        dominantDisease = dis;
      }
    });

    const dominantPct = total > 0 ? ((dominantCount / total) * 100).toFixed(1) : 0;
    const domElem = document.getElementById('kpi-dominant-disease');
    const domSubElem = document.getElementById('kpi-dominant-subtext');
    if (domElem) domElem.textContent = `${dominantDisease} (${dominantPct}%)`;
    if (domSubElem) {
      domSubElem.innerHTML = `<span class="kpi-badge badge-up">${dominantCount} cases</span> Leading vector outbreak`;
    }

    // KPI 3: Pediatric & Vulnerable Group Vulnerability Rate (<15 and >=60 years)
    const vulnerableCount = filteredPatients.filter(p => p.age < 15 || p.age >= 60).length;
    const vulnerablePct = total > 0 ? ((vulnerableCount / total) * 100).toFixed(1) : 0;
    
    const vulElem = document.getElementById('kpi-vulnerable-rate');
    const vulSubElem = document.getElementById('kpi-vulnerable-subtext');
    if (vulElem) vulElem.textContent = `${vulnerablePct}%`;
    if (vulSubElem) {
      vulSubElem.innerHTML = `<span class="kpi-badge badge-up">${vulnerableCount} patients</span> Children (<15) & Seniors (60+)`;
    }

    // KPI 4: Hotspot Epicenter Concentration (Top Zone)
    const zoneCounts = {};
    filteredPatients.forEach(p => {
      const key = p.zoneName || `Zone ${p.zoneNum}`;
      zoneCounts[key] = (zoneCounts[key] || 0) + 1;
    });

    let topZone = 'None';
    let topZoneCount = 0;
    Object.entries(zoneCounts).forEach(([z, c]) => {
      if (c > topZoneCount) {
        topZoneCount = c;
        topZone = z;
      }
    });

    const topZonePct = total > 0 ? ((topZoneCount / total) * 100).toFixed(1) : 0;
    const zoneElem = document.getElementById('kpi-epicenter-zone');
    const zoneSubElem = document.getElementById('kpi-epicenter-subtext');
    if (zoneElem) zoneElem.textContent = topZone.split('(')[0].trim() || topZone;
    if (zoneSubElem) {
      zoneSubElem.innerHTML = `<span class="kpi-badge badge-up">${topZoneCount} cases (${topZonePct}%)</span> Highest burden zone`;
    }

    // KPI 5: Primary Health Center (UPHC) vs Tertiary Hospital Burden
    const uphcCount = filteredPatients.filter(p => p.facilityType.includes('UPHC')).length;
    const uphcPct = total > 0 ? ((uphcCount / total) * 100).toFixed(1) : 0;
    
    const hospElem = document.getElementById('kpi-facility-uphc');
    const hospSubElem = document.getElementById('kpi-facility-subtext');
    if (hospElem) hospElem.textContent = `${uphcPct}% UPHC Share`;
    if (hospSubElem) {
      hospSubElem.innerHTML = `<span class="kpi-badge badge-neutral">${uphcCount} notified</span> via Urban Primary Health Centers`;
    }
  }
};
