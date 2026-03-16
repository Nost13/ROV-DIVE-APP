/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Ship, 
  Bell, 
  Info, 
  ExternalLink, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  CheckCircle2, 
  Users, 
  User, 
  Anchor, 
  History as HistoryIcon,
  ArrowDown,
  ArrowUp,
  Download,
  MoreHorizontal,
  Edit2,
  MessageSquarePlus,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vessel, Personnel, Dive, AppView, DiveLogEntry } from './types';

// Mock Data
const MOCK_VESSELS: Vessel[] = [
  {
    imo: '9876543',
    name: 'DeepSea Explorer',
    type: 'Offshore Supply Ship',
    callSign: 'DSE-X1',
    length: '150m',
    width: '32m',
    vesselAlpha: 'Vessel Alpha-1'
  },
  {
    imo: '9423712',
    name: 'Oceanic Voyager',
    type: 'Research Vessel',
    callSign: 'OV-77',
    length: '120m',
    width: '28m',
    vesselAlpha: 'Vessel Beta-2'
  }
];

const INITIAL_DIVES: Dive[] = [];

export default function App() {
  const [view, setView] = useState<AppView>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [personnel, setPersonnel] = useState<Personnel>({ pilotName: '', tenderName: '' });
  const [dives, setDives] = useState<Dive[]>(INITIAL_DIVES);
  const [isLaunching, setIsLaunching] = useState(false);
  const [timer, setTimer] = useState({ h: 0, m: 0, s: 0 });
  const [editingLog, setEditingLog] = useState<{ diveId: string, log: DiveLogEntry } | null>(null);
  const [editingDive, setEditingDive] = useState<Dive | null>(null);
  const [editLogData, setEditLogData] = useState({ time: '', event: '', description: '', note: '' });
  const [editDiveData, setEditDiveData] = useState({ number: 0, status: '' as 'ongoing' | 'completed' });

  // Timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLaunching) {
      interval = setInterval(() => {
        setTimer(prev => {
          let { h, m, s } = prev;
          s += 1;
          if (s >= 60) {
            s = 0;
            m += 1;
          }
          if (m >= 60) {
            m = 0;
            h += 1;
          }
          return { h, m, s };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLaunching]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const found = MOCK_VESSELS.find(v => v.imo === query.replace('IMO ', ''));
    if (found) {
      setSelectedVessel(found);
    } else {
      setSelectedVessel(null);
    }
  };

  const proceedToSetup = () => {
    if (selectedVessel) setView('setup');
  };

  const proceedToOperations = () => {
    if (personnel.pilotName && personnel.tenderName) {
      setView('operations');
    }
  };

  const handleLaunch = () => {
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setTimer({ h: 0, m: 0, s: 0 });
    const newDive: Dive = {
      id: `dive-${dives.length + 1}`,
      number: dives.length + 1,
      status: 'ongoing',
      startTime: now,
      logs: [
        {
          id: `log-${Date.now()}`,
          time: '00:00:00',
          event: 'ROV Launched',
          description: 'Successful deployment from main deck.',
          type: 'launch'
        }
      ]
    };
    setDives([newDive, ...dives]);
    setIsLaunching(true);
  };

  const handleRecovery = () => {
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const elapsed = `${timer.h.toString().padStart(2, '0')}:${timer.m.toString().padStart(2, '0')}:${timer.s.toString().padStart(2, '0')}`;
    setDives(prev => prev.map(d => {
      if (d.status === 'ongoing') {
        return {
          ...d,
          status: 'completed',
          endTime: now,
          logs: [
            ...d.logs,
            {
              id: `log-${Date.now()}`,
              time: elapsed,
              event: 'ROV Recovered',
              description: 'Successful recovery. Mission complete.',
              type: 'recovery'
            }
          ]
        };
      }
      return d;
    }));
    setIsLaunching(false);
  };

  const saveLogEdit = () => {
    if (!editingLog) return;
    setDives(prev => prev.map(dive => {
      if (dive.id === editingLog.diveId) {
        return {
          ...dive,
          logs: dive.logs.map(log => {
            if (log.id === editingLog.log.id) {
              return { 
                ...log, 
                time: editLogData.time,
                event: editLogData.event,
                description: editLogData.description,
                note: editLogData.note 
              };
            }
            return log;
          })
        };
      }
      return dive;
    }));
    setEditingLog(null);
  };

  const saveDiveEdit = () => {
    if (!editingDive) return;
    setDives(prev => prev.map(dive => {
      if (dive.id === editingDive.id) {
        return {
          ...dive,
          number: editDiveData.number,
          status: editDiveData.status
        };
      }
      return dive;
    }));
    setEditingDive(null);
  };

  const deleteLog = (diveId: string, logId: string) => {
    setDives(prev => {
      const updated = prev.map(dive => {
        if (dive.id === diveId) {
          return {
            ...dive,
            logs: dive.logs.filter(log => log.id !== logId)
          };
        }
        return dive;
      }).filter(dive => dive.logs.length > 0);

      // If the ongoing dive was deleted, reset launching state
      const hasOngoing = updated.some(d => d.status === 'ongoing');
      if (!hasOngoing && isLaunching) {
        setIsLaunching(false);
      }
      
      return updated;
    });
  };

  const handleDownloadLogs = () => {
    if (!selectedVessel) return;

    // CSV Headers
    const headers = [
      'Vessel Name',
      'IMO',
      'Pilot',
      'Tender',
      'Dive Number',
      'Dive Status',
      'Log Time',
      'Event',
      'Description',
      'Note'
    ];

    const rows: string[][] = [];

    dives.forEach(dive => {
      dive.logs.forEach(log => {
        rows.push([
          selectedVessel.name,
          selectedVessel.imo,
          personnel.pilotName,
          personnel.tenderName,
          `Dive #${dive.number.toString().padStart(2, '0')}`,
          dive.status.toUpperCase(),
          log.time,
          log.event,
          log.description,
          log.note || ''
        ]);
      });
    });

    // Convert to CSV string
    // Escape quotes and wrap in quotes to handle commas in text
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ROV_Logs_${selectedVessel.name.replace(/\s+/g, '_')}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        {view === 'search' && (
          <motion.div 
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Ship className="text-primary w-6 h-6" />
                <h1 className="text-lg font-bold tracking-tight">Vessel Search</h1>
              </div>
              <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
              </button>
            </header>

            <main className="flex-1 p-4 space-y-6">
              <section className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600 ml-1">IMO Number Search</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                      <Search className="w-5 h-5" />
                    </div>
                    <input 
                      className="block w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all text-lg font-medium outline-none"
                      placeholder="Enter Vessel IMO Number (e.g. 9423712)"
                      value={searchQuery}
                      onChange={handleSearch}
                    />
                  </div>
                  <p className="text-xs text-slate-500 ml-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    International Maritime Organization unique identifier
                  </p>
                </div>
              </section>

              {!selectedVessel ? (
                <section className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-4 opacity-60">
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                    <Ship className="w-12 h-12 text-primary/60" />
                  </div>
                  <h2 className="text-xl font-bold">No Vessel Selected</h2>
                  <p className="max-w-xs text-slate-600">Search for a vessel by IMO number to start the operation setup and configuration.</p>
                  <button className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
                    How to find IMO? <ExternalLink className="w-4 h-4" />
                  </button>
                </section>
              ) : (
                <section className="space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-primary text-[10px] font-bold uppercase tracking-wider mb-1">Vessel Identified</p>
                        <h3 className="text-xl font-bold">{selectedVessel.name}</h3>
                      </div>
                      <CheckCircle2 className="text-green-500 w-6 h-6" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">IMO Number</p>
                        <p className="font-bold text-slate-800">{selectedVessel.imo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Type</p>
                        <p className="font-bold text-slate-800">{selectedVessel.type}</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </main>

            <footer className="p-4 bg-white border-t border-slate-200 space-y-4">
              <button 
                onClick={proceedToSetup}
                disabled={!selectedVessel}
                className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  selectedVessel 
                    ? 'bg-primary text-white shadow-primary/25 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Proceed to Setup</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <nav className="flex items-center justify-around py-2">
                <button className="flex flex-col items-center gap-1 text-primary">
                  <Search className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase">Search</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400">
                  <Anchor className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase">Operations</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400">
                  <HistoryIcon className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase">History</span>
                </button>
              </nav>
            </footer>
          </motion.div>
        )}

        {view === 'setup' && selectedVessel && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            <header className="bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setView('search')} className="p-1 -ml-1">
                  <ArrowLeft className="w-6 h-6 text-slate-900" />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Vessel Setup</h1>
              </div>
              <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <HelpCircle className="w-5 h-5 text-slate-500" />
              </button>
            </header>

            <main className="flex-1 p-4 space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  className="block w-full h-12 pl-12 pr-4 bg-slate-100 border-none rounded-lg text-base font-medium outline-none"
                  readOnly
                  value={`IMO ${selectedVessel.imo}`}
                />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-primary text-[10px] font-bold uppercase tracking-wider mb-1">Vessel Identified</p>
                    <h3 className="text-2xl font-extrabold">{selectedVessel.name}</h3>
                  </div>
                  <CheckCircle2 className="text-green-500 w-6 h-6" />
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">IMO Number</p>
                    <p className="font-bold text-slate-900">{selectedVessel.imo}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Vessel Type</p>
                    <p className="font-bold text-slate-900">{selectedVessel.type}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Call Sign</p>
                    <p className="font-bold text-slate-900">{selectedVessel.callSign}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Length</p>
                    <p className="font-bold text-slate-900">{selectedVessel.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Width</p>
                    <p className="font-bold text-slate-900">{selectedVessel.width}</p>
                  </div>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Personnel Configuration</h3>
                </div>
                <p className="text-slate-500 text-sm">Assign required personnel for the upcoming operations.</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Pilot Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Enter pilot name"
                        value={personnel.pilotName}
                        onChange={(e) => setPersonnel(p => ({ ...p, pilotName: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tender Name</label>
                    <div className="relative">
                      <Ship className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Enter tender name"
                        value={personnel.tenderName}
                        onChange={(e) => setPersonnel(p => ({ ...p, tenderName: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </main>

            <footer className="p-4 bg-white border-t border-slate-200">
              <button 
                onClick={proceedToOperations}
                disabled={!personnel.pilotName || !personnel.tenderName}
                className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  personnel.pilotName && personnel.tenderName
                    ? 'bg-primary text-white shadow-primary/25 active:scale-95' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Proceed to Operations</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </footer>
          </motion.div>
        )}

        {view === 'operations' && selectedVessel && (
          <motion.div 
            key="operations"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex-1 flex flex-col"
          >
            <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Ship className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold leading-tight">{selectedVessel.name}</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{selectedVessel.vesselAlpha}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-medium text-slate-500">Pilot:</span>
                    <span className="text-[10px] font-bold">{personnel.pilotName}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-medium text-slate-500">Tender:</span>
                    <span className="text-[10px] font-bold">{personnel.tenderName}</span>
                  </div>
                </div>
              </div>
            </header>

            <main className="flex-1 p-4 space-y-6 pb-24">
              <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operation Dives</h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                
                <div className="flex gap-4 justify-center mb-8">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full py-4 bg-slate-100 rounded-lg flex items-center justify-center">
                      <p className="text-4xl font-bold tracking-tight text-primary">{timer.h.toString().padStart(2, '0')}</p>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Hours</p>
                  </div>
                  <div className="flex items-center pb-6 text-2xl font-bold text-slate-300">:</div>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full py-4 bg-slate-100 rounded-lg flex items-center justify-center">
                      <p className="text-4xl font-bold tracking-tight text-primary">{timer.m.toString().padStart(2, '0')}</p>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Minutes</p>
                  </div>
                  <div className="flex items-center pb-6 text-2xl font-bold text-slate-300">:</div>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-full py-4 bg-slate-100 rounded-lg flex items-center justify-center">
                      <p className="text-4xl font-bold tracking-tight text-primary">{timer.s.toString().padStart(2, '0')}</p>
                    </div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Seconds</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                  <button 
                    onClick={handleLaunch}
                    disabled={isLaunching}
                    className={`flex items-center justify-center gap-2 py-4 rounded-lg text-sm font-bold transition-all ${
                      isLaunching 
                        ? 'text-slate-400' 
                        : 'bg-primary text-white shadow-lg shadow-primary/30 active:scale-95'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4" />
                    LAUNCH
                  </button>
                  <button 
                    onClick={handleRecovery}
                    disabled={!isLaunching}
                    className={`flex items-center justify-center gap-2 py-4 rounded-lg text-sm font-bold transition-all ${
                      !isLaunching 
                        ? 'text-slate-400' 
                        : 'bg-primary text-white shadow-lg shadow-primary/30 active:scale-95'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    RECOVERY
                  </button>
                </div>
                
                <AnimatePresence>
                  {isLaunching && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center justify-center gap-2 py-1.5 px-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400/50 mt-[10px]"
                    >
                      <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
                      <p className="text-[10px] font-black text-white tracking-[0.15em] uppercase">ROV DEPLOYED</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operation Dives</h3>
                </div>

                <div className="space-y-4">
                  {dives.map((dive) => (
                    <div key={dive.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <div className={`px-4 py-3 border-b border-slate-100 flex justify-between items-center ${
                        dive.status === 'ongoing' ? 'bg-primary/5' : 'bg-slate-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-widest ${
                            dive.status === 'ongoing' ? 'text-primary' : 'text-slate-900'
                          }`}>
                            Dive #{dive.number.toString().padStart(2, '0')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            — {dive.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              setEditingDive(dive);
                              setEditDiveData({ number: dive.number, status: dive.status });
                            }}
                            className="text-slate-400 hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {dive.status === 'ongoing' ? (
                            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                          ) : (
                            <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                          )}
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {dive.logs.map((log) => (
                          <div key={log.id} className="p-4 space-y-3">
                            <div className="flex gap-4">
                              <span className="text-xs font-mono font-bold text-primary shrink-0 pt-0.5">{log.time}</span>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className={`text-sm font-bold ${dive.status === 'ongoing' ? 'text-primary' : 'text-slate-900'}`}>
                                      {log.event}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => {
                                        setEditingLog({ diveId: dive.id, log });
                                        setEditLogData({ 
                                          time: log.time, 
                                          event: log.event, 
                                          description: log.description, 
                                          note: log.note || '' 
                                        });
                                      }}
                                      className="text-slate-300 hover:text-primary transition-colors"
                                    >
                                      <MessageSquarePlus className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => deleteLog(dive.id, log.id)}
                                      className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {log.note && (
                                  <div className="mt-2 p-2 bg-slate-50 rounded border-l-2 border-primary text-[11px] text-slate-600 italic">
                                    "{log.note}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </main>

            {/* Edit Log Modal */}
            <AnimatePresence>
              {editingLog && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">Edit Log Entry</h4>
                      <button onClick={() => setEditingLog(null)} className="text-slate-400">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elapsed Time</label>
                        <input 
                          type="text"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          value={editLogData.time}
                          onChange={(e) => setEditLogData({ ...editLogData, time: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Name</label>
                        <input 
                          type="text"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          value={editLogData.event}
                          onChange={(e) => setEditLogData({ ...editLogData, event: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note / Description</label>
                        <textarea 
                          className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                          placeholder="Type your note here..."
                          value={editLogData.note}
                          onChange={(e) => setEditLogData({ ...editLogData, note: e.target.value })}
                        />
                      </div>
                      <button 
                        onClick={saveLogEdit}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Edit Dive Modal */}
            <AnimatePresence>
              {editingDive && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">Edit Dive Details</h4>
                      <button onClick={() => setEditingDive(null)} className="text-slate-400">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dive Number</label>
                        <input 
                          type="number"
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          value={editDiveData.number}
                          onChange={(e) => setEditDiveData({ ...editDiveData, number: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                        <select 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                          value={editDiveData.status}
                          onChange={(e) => setEditDiveData({ ...editDiveData, status: e.target.value as 'ongoing' | 'completed' })}
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <button 
                        onClick={saveDiveEdit}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background-light via-background-light/95 to-transparent max-w-md mx-auto">
              <button 
                onClick={handleDownloadLogs}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                <Download className="w-5 h-5" />
                DOWNLOAD LOG
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
