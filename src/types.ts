export interface Vessel {
  imo: string;
  name: string;
  type: string;
  callSign: string;
  length: string;
  width: string;
  vesselAlpha?: string;
}

export interface Personnel {
  pilotName: string;
  tenderName: string;
}

export interface DiveLogEntry {
  id: string;
  time: string;
  event: string;
  description: string;
  type: 'launch' | 'recovery' | 'pending';
  note?: string;
}

export interface Dive {
  id: string;
  number: number;
  status: 'ongoing' | 'completed';
  startTime: string;
  endTime?: string;
  logs: DiveLogEntry[];
}

export type AppView = 'search' | 'setup' | 'operations' | 'history';
