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

  rawPatients: [],
  rawHighRisk: [],
  patients: [],
  highRiskAreas: [],

  async init() {
    try {
      const [sheet1Data, sheet2Data] = await Promise.all([
        this.fetchCsv(this.sheet1Url, this.sheet1Fallback),
        this.fetchCsv(this.sheet2Url, this.sheet2Fallback)
      ]);

      this.rawPatients = sheet1Data;
      this.rawHighRisk = sheet2Data;

      this.processHighRiskData();
      this.processPatientData();

      console.log(`[DataLoader] Loaded ${this.patients.length} patient records and ${this.highRiskAreas.length} high-risk zones.`);
      return { patients: this.patients, highRiskAreas: this.highRiskAreas };
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

      // Standardize Date
      let parsedDate = null;
      if (rawDate) {
        const parts = rawDate.split('.');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          parsedDate = `${y}-${m}-${day}`;
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
        zoneNum,
        zoneName: ZONE_MAP[zoneNum] || `Zone ${zoneNum}`,
        prabhagNum,
        isHighRiskMatch,
        matchedHighRiskLocality
      };
    });
  }
};
