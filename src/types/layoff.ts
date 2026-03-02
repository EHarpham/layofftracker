export interface LayoffEvent {
  company: string;
  date: string;          // ISO date string, e.g. "2024-01-15"
  numEmployees: number;  // -1 when unknown
  percentage: number;    // -1 when unknown
  industry: string;
  country: string;
  stage: string;
  source: string;
  locationHQ?: string;   // e.g. "SF Bay Area"
  raisedMM?: number;     // funding raised in millions, e.g. 986
}

export interface BreakdownEntry {
  name: string;
  totalEmployees: number;
  eventCount: number;
}

export interface LayoffStats {
  totalEmployees: number;
  totalCompanies: number;
  latestEvent: LayoffEvent | null;
  topIndustry: string;
  topIndustryCount: number;
  thisYear: number;
  avgPercentage: number;
  worstCut: LayoffEvent | null;
  byIndustry: BreakdownEntry[];
  byCountry: BreakdownEntry[];
  byStage: BreakdownEntry[];
}
