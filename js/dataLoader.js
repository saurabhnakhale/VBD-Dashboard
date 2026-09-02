/**
 * DataLoader.js - Responsible for loading, parsing, cleaning, and enriching
 * vector-borne disease linelist data and high-risk area mappings.
 */

const ZONE_MAP = {
  1: "Laxminagar (Zone 1)",
  2: "Dharampeth (Zone 2)",
  3: "Hanumannagar (Zone 3)",
  4: "Dhantoli (Zone 4)",
  5: "Nehru Nagar (Zone 5)",
  6: "Gandhibagh (Zone 6)",
  7: "Satranjipura (Zone 7)",
  8: "Lakadganj (Zone 8)",
  9: "Ashinagar (Zone 9)",
  10: "Mangalwari (Zone 10)"
};

const DataLoader = {
  sheet1Url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7XwXF_aiMSrrvyTTdNFA87B9tN43KjaCLtwrc1gF_gf2E9VIwF6DSeb7-G2HUFCmTkPyCCKxOitKd/pub?output=csv",
  sheet1Fallback: "./data/linelist_fallback.csv",
  sheet2Url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7XwXF_aiMSrrvyTTdNFA87B9tN43KjaCLtwrc1gF_gf2E9VIwF6DSeb7-G2HUFCmTkPyCCKxOitKd/pub?gid=334334882&single=true&output=csv",
  sheet2Fallback: "./data/highrisk_fallback.csv",
  sheet3Url: "https://docs.google.com/spreadsheets/d/1LI9hNsozPx4TO66prv_QwM8ikILP3aenQxGSy6pQ4FI/export?format=csv&gid=302283847",
  sheet3Fallback: "./data/entomology_fallback.csv",

  rawPatients: [],
  rawHighRisk: [],
  rawEntomology: [],
  patients: [],
  highRiskAreas: [],
  entomologyRecords: [],

  async init() {
    try {
      const [sheet1Data, sheet2Data, sheet3Data] = await Promise.all([
        this.fetchCsv(this.sheet1Url, this.sheet1Fallback),
        this.fetchCsv(this.sheet2Url, this.sheet2Fallback),
        this.fetchCsv(this.sheet3Url, this.sheet3Fallback)
      ]);

      this.rawPatients = sheet1Data;
      this.rawHighRisk = sheet2Data;
      this.rawEntomology = sheet3Data;

      this.processHighRiskData();
      this.processPatientData();
      this.processEntomologyData();

      console.log(`[DataLoader] Loaded ${this.patients.length} patient records, ${this.highRiskAreas.length} high-risk zones, and ${this.entomologyRecords.length} entomological records.`);
      return { patients: this.patients, highRiskAreas: this.highRiskAreas, entomologyRecords: this.entomologyRecords };
    } catch (err) {
      console.error("[DataLoader] Critical error initializing data:", err);
      throw err;
    }
  },

  fetchCsv(primaryUrl, fallbackUrl) {
    return new Promise((resolve) => {
      Papa.parse(primaryUrl, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            resolve(results.data);
          } else {
            console.warn(`[DataLoader] Primary URL empty, fetching fallback: ${fallbackUrl}`);
            this.fetchLocalCsv(fallbackUrl, resolve);
          }
        },
        error: (err) => {
          console.warn(`[DataLoader] Primary URL failed (${err.message}), fetching fallback: ${fallbackUrl}`);
          this.fetchLocalCsv(fallbackUrl, resolve);
        }
      });
    });
  },

  fetchLocalCsv(fallbackUrl, resolve) {
    Papa.parse(fallbackUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: () => resolve([])
    });
  },

  processHighRiskData() {
    this.highRiskAreas = this.rawHighRisk.map((row) => {
      const zoneStr = row['NAME OF ZONE'] || row['Zone'] || '';
      const zoneNum = parseInt(zoneStr.replace(/\D/g, ''), 10) || 0;
      const prabhagStr = row['PRABHAG'] || row['Prabbhag'] || row['Prabhag'] || '';
      const prabhagNum = parseInt(prabhagStr.replace(/\D/g, ''), 10) || 0;

      return {
        disease: row['Disease'] || 'All',
        zoneName: zoneStr,
        zoneNum: zoneNum,
        prabhag: prabhagNum,
        highRiskDengue: (row['HIGH RISK AREA For Dengue'] || '').trim(),
        highRiskChikungunya: (row['HIGH RISK AREA For Chikungunya'] || '').trim()
      };
    });
  },

  processPatientData() {
    this.patients = this.rawPatients.map((row, idx) => {
      const srNo = parseInt(row['Sr. No.'] || (idx + 1), 10);
      const month = (row['Month'] || '').trim();
      const year = parseInt(row['Year'] || '2024', 10);
      const name = (row["Patient's Name"] || row["Patient Name"] || 'Anonymous').trim();
      const address = (row['Address'] || '').trim();
      const age = parseInt(row['Age'] || '0', 10);
      const sex = (row['Sex'] || 'Unknown').trim();
      const disease = (row['Disease'] || 'Unknown').trim();
      const hospital = (row['Name of Hospital'] || 'Unspecified').trim();
      const rawDate = row['Date. of Notification'] || row['Date of Notification'] || '';
      const zoneNum = parseInt(row['Zone'] || '0', 10);
      const prabhagNum = parseInt(row['Prabhag'] || '0', 10);

      // Standardize Date (Supports '.', '/', '-', space, ISO, etc.)
      let parsedDate = null;
      let dateObj = null;

      let dateStr = rawDate;
      if (!dateStr) {
        for (const k of Object.keys(row)) {
          if (k.toLowerCase().includes('date') || k.toLowerCase().includes('notification')) {
            if (row[k] && row[k].trim()) {
              dateStr = row[k].trim();
              break;
            }
          }
        }
      }

      if (dateStr) {
        const parts = dateStr.split(/[\.\/\-\s]+/);
        if (parts.length >= 3) {
          let day, m, y;
          if (parts[0].length === 4) {
            y = parts[0];
            m = parts[1].padStart(2, '0');
            day = parts[2].padStart(2, '0');
          } else {
            day = parts[0].padStart(2, '0');
            m = parts[1].padStart(2, '0');
            y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          }
          const yNum = parseInt(y, 10);
          const mNum = parseInt(m, 10);
          const dNum = parseInt(day, 10);
          if (!isNaN(yNum) && !isNaN(mNum) && !isNaN(dNum) && mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
            parsedDate = `${y}-${m}-${day}`;
            dateObj = new Date(yNum, mNum - 1, dNum);
          }
        }
      }

      // Fallback: If rawDate missing/unparseable, derive synthetic date from Month & Year
      if ((!dateObj || isNaN(dateObj.getTime())) && month && year) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mIdx = monthNames.findIndex(mn => month.toLowerCase().startsWith(mn));
        if (mIdx !== -1) {
          const dayNum = ((srNo * 3) % 28) + 1;
          const dayStr = String(dayNum).padStart(2, '0');
          const mStr = String(mIdx + 1).padStart(2, '0');
          parsedDate = `${year}-${mStr}-${dayStr}`;
          dateObj = new Date(year, mIdx, dayNum);
        }
      }

      // Age Bracket
      let ageGroup = 'Adult (35-59)';
      if (age < 15) ageGroup = 'Pediatric (<15)';
      else if (age >= 15 && age < 35) ageGroup = 'Youth (15-34)';
      else if (age >= 60) ageGroup = 'Elderly (60+)';

      // Facility Type
      let facilityType = 'Private Hospital / Lab';
      const hospUpper = hospital.toUpperCase();
      if (hospUpper.includes('UPHC') || hospUpper.includes('PHC')) {
        facilityType = 'Urban Primary Health Center (UPHC)';
      } else if (hospUpper.includes('IGMC') || hospUpper.includes('GMCH') || hospUpper.includes('GOVT')) {
        facilityType = 'Tertiary Government Hospital';
      }

      // High Risk Locality Match (Sheet 2)
      let isHighRiskMatch = false;
      let matchedHighRiskLocality = '';
      
      const zoneHighRiskList = this.highRiskAreas.filter(hr => hr.zoneNum === zoneNum);
      const addrLower = address.toLowerCase();

      for (const hr of zoneHighRiskList) {
        const dengueLocs = hr.highRiskDengue.toLowerCase().split(',').map(s => s.trim());
        const chikuLocs = hr.highRiskChikungunya.toLowerCase().split(',').map(s => s.trim());
        
        const allLocs = [...dengueLocs, ...chikuLocs].filter(l => l.length > 3);
        for (const loc of allLocs) {
          if (addrLower.includes(loc)) {
            isHighRiskMatch = true;
            matchedHighRiskLocality = loc;
            break;
          }
        }
        if (isHighRiskMatch) break;
      }

      return {
        id: srNo,
        month,
        year,
        name,
        address,
        age,
        ageGroup,
        sex,
        disease,
        hospital,
        facilityType,
        rawDate,
        parsedDate,
        dateObj,
        zoneNum,
        zoneName: ZONE_MAP[zoneNum] || `Zone ${zoneNum}`,
        prabhagNum,
        isHighRiskMatch,
        matchedHighRiskLocality
      };
    });
  },

  processEntomologyData() {
    const records = [];
    let currentMonth = '';

    if (!Array.isArray(this.rawEntomology)) return;

    this.rawEntomology.forEach(row => {
      const keys = Object.keys(row);
      if (keys.length < 5) return;

      const monthCol = (row[keys[0]] || '').trim();
      const zoneCol = (row[keys[1]] || '').trim();

      if (monthCol && !monthCol.toLowerCase().includes('total')) {
        currentMonth = monthCol;
      }

      if (!zoneCol || zoneCol.toLowerCase().includes('total') || zoneCol.toLowerCase().includes('grand total')) {
        return;
      }

      const zMatch = zoneCol.match(/\d+/);
      const zoneNum = zMatch ? parseInt(zMatch[0], 10) : 0;
      if (!zoneNum || zoneNum < 1 || zoneNum > 10) return;

      const inspectedHouses = parseFloat(row[keys[2]]) || 0;
      const positiveHouses = parseFloat(row[keys[3]]) || 0;
      const inspectedContainers = parseFloat(row[keys[4]]) || 0;
      const positiveContainers = parseFloat(row[keys[5]]) || 0;

      let hi = parseFloat(row['HI'] || row[keys[6]]) || 0;
      let ci = parseFloat(row['CI'] || row[keys[7]]) || 0;
      let bi = parseFloat(row['BI'] || row[keys[8]]) || 0;

      if (!hi && inspectedHouses > 0) hi = parseFloat(((positiveHouses / inspectedHouses) * 100).toFixed(1));
      if (!ci && inspectedContainers > 0) ci = parseFloat(((positiveContainers / inspectedContainers) * 100).toFixed(1));
      if (!bi && inspectedHouses > 0) bi = parseFloat(((positiveContainers / inspectedHouses) * 100).toFixed(1));

      records.push({
        month: currentMonth || 'Unspecified',
        zoneCol,
        zoneNum,
        zoneName: ZONE_MAP[zoneNum] || `Zone ${zoneNum}`,
        inspectedHouses,
        positiveHouses,
        inspectedContainers,
        positiveContainers,
        hi,
        ci,
        bi
      });
    });

    this.entomologyRecords = records;
  }
};
