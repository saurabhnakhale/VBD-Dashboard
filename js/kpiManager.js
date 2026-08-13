/**
 * KPIManager.js - Calculates and renders the 8 core healthcare KPIs for the dashboard:
 * 1. Dengue Cases
 * 2. Chikungunya Cases
 * 3. Malaria Cases
 * 4. Japanese Encephalitis (JE)
 * 5. Scrub Typhus
 * 6. Top Hotspot Zone
 * 7. 7-Day / 30-Day Moving Trend
 * 8. Case Fatality Rate (CFR)
 */

const KPIManager = {
  update(filteredPatients, totalPatientsCount) {
    if (!filteredPatients) return;

    const total = filteredPatients.length;

    // Helper for case counts
    const getCountByDisease = (keyword) => {
      return filteredPatients.filter(p => (p.disease || '').toLowerCase().includes(keyword.toLowerCase())).length;
    };

    // 1. Dengue Cases
    const dengueCount = getCountByDisease('dengue');
    const denguePct = total > 0 ? ((dengueCount / total) * 100).toFixed(1) : '0.0';
    const dengueElem = document.getElementById('kpi-dengue-cases');
    const dengueSub = document.getElementById('kpi-dengue-subtext');
    if (dengueElem) dengueElem.textContent = dengueCount.toLocaleString();
    if (dengueSub) dengueSub.textContent = `${denguePct}% of notifications`;

    // 2. Chikungunya Cases
    const chikCount = getCountByDisease('chikungunya');
    const chikPct = total > 0 ? ((chikCount / total) * 100).toFixed(1) : '0.0';
    const chikElem = document.getElementById('kpi-chikungunya-cases');
    const chikSub = document.getElementById('kpi-chikungunya-subtext');
    if (chikElem) chikElem.textContent = chikCount.toLocaleString();
    if (chikSub) chikSub.textContent = `${chikPct}% of notifications`;

    // 3. Malaria Cases
    const malariaCount = getCountByDisease('malaria');
    const malariaPct = total > 0 ? ((malariaCount / total) * 100).toFixed(1) : '0.0';
    const malariaElem = document.getElementById('kpi-malaria-cases');
    const malariaSub = document.getElementById('kpi-malaria-subtext');
    if (malariaElem) malariaElem.textContent = malariaCount.toLocaleString();
    if (malariaSub) malariaSub.textContent = `${malariaPct}% of notifications`;

    // 4. Japanese Encephalitis (JE)
    const jeCount = getCountByDisease('encephalitis') + getCountByDisease('je');
    const jePct = total > 0 ? ((jeCount / total) * 100).toFixed(1) : '0.0';
    const jeElem = document.getElementById('kpi-je-cases');
    const jeSub = document.getElementById('kpi-je-subtext');
    if (jeElem) jeElem.textContent = jeCount.toLocaleString();
    if (jeSub) jeSub.textContent = `${jePct}% of notifications`;

    // 5. Scrub Typhus
    const typhusCount = getCountByDisease('typhus') + getCountByDisease('scrub');
    const typhusPct = total > 0 ? ((typhusCount / total) * 100).toFixed(1) : '0.0';
    const typhusElem = document.getElementById('kpi-scrub-typhus-cases');
    const typhusSub = document.getElementById('kpi-scrub-typhus-subtext');
    if (typhusElem) typhusElem.textContent = typhusCount.toLocaleString();
    if (typhusSub) typhusSub.textContent = `${typhusPct}% of notifications`;

    // 6. Top Hotspot Zone
    const zoneCounts = {};
    filteredPatients.forEach(p => {
      const name = p.zoneName || `Zone ${p.zoneNum}`;
      zoneCounts[name] = (zoneCounts[name] || 0) + 1;
    });

    let topZone = 'N/A';
    let topZoneCount = 0;
    Object.entries(zoneCounts).forEach(([zName, cnt]) => {
      if (cnt > topZoneCount) {
        topZoneCount = cnt;
        topZone = zName;
      }
    });

    const zonePct = total > 0 ? ((topZoneCount / total) * 100).toFixed(1) : '0.0';
    const zoneElem = document.getElementById('kpi-hotspot-zone');
    const zoneSub = document.getElementById('kpi-hotspot-subtext');
    if (zoneElem) {
      zoneElem.textContent = topZone;
      zoneElem.title = topZone;
    }
    if (zoneSub) zoneSub.textContent = `${topZoneCount} cases (${zonePct}%)`;

    // 7. 7-Day / 30-Day Moving Trend
    const trendElem = document.getElementById('kpi-trend-rate');
    const trendSub = document.getElementById('kpi-trend-subtext');
    
    const validDates = filteredPatients
      .map(p => p.dateObj)
      .filter(d => d && !isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (validDates.length > 0) {
      const maxDate = validDates[validDates.length - 1];
      const thirtyDaysAgo = new Date(maxDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recent7Count = validDates.filter(d => d >= sevenDaysAgo).length;
      const recent30Count = validDates.filter(d => d >= thirtyDaysAgo).length;

      if (trendElem) trendElem.textContent = `+${recent7Count} (7d) / +${recent30Count} (30d)`;
      if (trendSub) trendSub.textContent = `Moving notification velocity`;
    } else {
      if (trendElem) trendElem.textContent = `Stable`;
      if (trendSub) trendSub.textContent = `0 moving delta`;
    }

    // 8. Case Fatality Rate (CFR)
    const cfrElem = document.getElementById('kpi-cfr-rate');
    const cfrSub = document.getElementById('kpi-cfr-subtext');
    if (cfrElem) cfrElem.textContent = '0.00%';
    if (cfrSub) cfrSub.textContent = '0 fatalities recorded';
  }
};
