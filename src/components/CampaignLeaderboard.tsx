import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Trophy, Award, Search, Download, Sparkles, RefreshCw } from 'lucide-react';
import { useCampaignParticipants, useCampaignEvents, useAllCampaignResponses } from '../hooks/useParticipants';
import { exportLeaderboardCSV } from '../services/csvExportService';

interface CampaignLeaderboardProps {
  clientId: string;
  campaignId: string;
}

export default function CampaignLeaderboard({ clientId, campaignId }: CampaignLeaderboardProps) {
  const { data: participants = [], isLoading: isLoadingParticipants, refetch: refetchParticipants } = 
    useCampaignParticipants(clientId, campaignId);
  const { data: events = [], isLoading: isLoadingEvents, refetch: refetchEvents } = 
    useCampaignEvents(clientId, campaignId);
  const { data: allResponses = [], isLoading: isLoadingResponses, refetch: refetchResponses } = 
    useAllCampaignResponses(clientId, campaignId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefetching, setIsRefetching] = useState(false);

  // Core Refresh Button Handler
  const handleManualRefresh = async () => {
    setIsRefetching(true);
    await Promise.all([
      refetchParticipants(),
      refetchEvents(),
      refetchResponses()
    ]);
    setTimeout(() => setIsRefetching(false), 600);
  };

  // Build the ranked standings list
  const standings = useMemo(() => {
    // 1. Create a lookup map for resolved events to count correct responses
    const resolvedEventAnswers = new Map<string, string>();
    events.forEach(e => {
      if (e.correctAnswer) {
        resolvedEventAnswers.set(e.id, e.correctAnswer.toLowerCase().trim());
      }
    });

    // 2. Iterate through participants to join with they scores
    const rows = participants.map(p => {
      // Find all predictions/responses compiled by this participant
      const pResponses = allResponses.filter(r => r.participantId === p.id);
      
      // Count correct selections
      const correctResponses = pResponses.filter(r => {
        const official = resolvedEventAnswers.get(r.eventId);
        return official && r.answer.toLowerCase().trim() === official;
      });

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email || 'None Provided',
        source: p.source,
        totalPoints: p.totalPoints || 0,
        predictionsSubmitted: pResponses.length,
        correctAnswersCount: correctResponses.length,
      };
    });

    // 3. Sort by totalPoints descending. If points match, sort by correctAnswersCount desc
    return rows.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.correctAnswersCount - a.correctAnswersCount;
    });
  }, [participants, events, allResponses]);

  // Apply Search Filtering inline
  const filteredStandings = useMemo(() => {
    if (!searchQuery.trim()) return standings;
    const norm = searchQuery.toLowerCase();
    return standings.filter(s => 
      s.name.toLowerCase().includes(norm) || 
      s.phone.includes(norm) ||
      s.email?.toLowerCase().includes(norm)
    );
  }, [standings, searchQuery]);

  // Export standings as CSV
  const handleExportCSV = () => {
    if (standings.length === 0) return;
    exportLeaderboardCSV(campaignId, standings);
  };

  const isLoading = isLoadingParticipants || isLoadingEvents || isLoadingResponses;

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono">Assembling scoreboard matrices...</p>
      </div>
    );
  }

  // Slice standings to pull gold, silver, bronze winners
  const topThree = standings.slice(0, 3);
  const remainingStandings = filteredStandings.slice(3);

  return (
    <div className="space-y-8" id="campaign-leaderboard-panel">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            Arena Standings & Leaderboard
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Gamified rankings calculated in real-time. Standings dynamically update based on official results and campaign rules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefetching}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white rounded-xl transition flex items-center gap-2 text-xs font-semibold"
            title="Force refresh database scores"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Update Standings</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={standings.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 hover:text-emerald-350 rounded-xl transition flex items-center gap-2 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {standings.length === 0 ? (
        <div className="bg-slate-900/20 border border-slate-850 p-12 rounded-2xl text-center space-y-3">
          <Trophy className="h-10 w-10 text-slate-650 mx-auto" />
          <p className="text-xs text-slate-400 font-medium">No participant has been logged or registered yet.</p>
          <p className="text-xxs text-slate-550 leading-relaxed max-w-xs mx-auto">
            Once participants register on your public page, they'll show up here with dynamic scores.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Visual Trophy Stage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
            {/* 2nd Place: Silver (Shown on Left on Desktop) */}
            {topThree[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-gradient-to-b from-slate-900/60 to-slate-950/40 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex flex-col items-center text-center group hover:border-slate-700 transition"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition"></div>
                <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 font-extrabold text-sm mb-3">
                  #2
                </div>
                <Award className="h-8 w-8 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-200 block truncate max-w-full">{topThree[1].name}</span>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{topThree[1].phone}</span>
                
                <div className="mt-4 pt-4 border-t border-slate-900 w-full grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Correct</span>
                    <span className="text-xs font-bold text-slate-300 font-mono mt-0.5 block">{topThree[1].correctAnswersCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Points</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">{topThree[1].totalPoints} XP</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1st Place: Gold (Centered) */}
            {topThree[0] && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-yellow-500/30 p-6 rounded-2xl relative overflow-hidden flex flex-col items-center text-center shadow-lg hover:border-yellow-500/50 transition group"
              >
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition"></div>
                <div className="absolute top-2.5 left-2.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-400" />
                  <span className="text-[8px] font-mono font-bold text-yellow-400 uppercase tracking-widest">Aura Leader</span>
                </div>

                <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-black text-base mb-3 mt-4">
                  #1
                </div>
                <Trophy className="h-10 w-10 text-yellow-400 mb-2.5 animate-bounce" style={{ animationDuration: '3s' }} />
                <span className="text-sm font-black text-white block truncate max-w-full tracking-tight">{topThree[0].name}</span>
                <span className="text-xs font-mono text-slate-450 block mt-0.5">{topThree[0].phone}</span>
                
                <div className="mt-4 pt-4 border-t border-slate-850 w-full grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Correct</span>
                    <span className="text-xs font-extrabold text-slate-200 font-mono mt-0.5 block">{topThree[0].correctAnswersCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Points</span>
                    <span className="text-sm font-black text-yellow-400 font-mono mt-0.5 block">{topThree[0].totalPoints} XP</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place: Bronze (Shown on Right) */}
            {topThree[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-gradient-to-b from-slate-900/60 to-slate-950/40 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden flex flex-col items-center text-center group hover:border-slate-700 transition"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-650/5 rounded-full blur-2xl group-hover:bg-orange-650/10 transition"></div>
                <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 font-extrabold text-sm mb-3">
                  #3
                </div>
                <Award className="h-8 w-8 text-amber-600 mb-2" />
                <span className="text-xs font-bold text-slate-200 block truncate max-w-full">{topThree[2].name}</span>
                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{topThree[2].phone}</span>
                
                <div className="mt-4 pt-4 border-t border-slate-900 w-full grid grid-cols-2 gap-2 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Correct</span>
                    <span className="text-xs font-bold text-slate-300 font-mono mt-0.5 block">{topThree[2].correctAnswersCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Points</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">{topThree[2].totalPoints} XP</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Search input for remaining directory query */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search standings by participant name, registered phone or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/30 hover:bg-slate-900/50 border border-slate-850 focus:border-emerald-500/80 block w-full pl-10 pr-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 transition focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Leaderboard Competitors Directory Grid Table */}
          <div className="bg-slate-900/20 border border-slate-850 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/40 text-[10px] text-slate-500 font-mono uppercase font-bold select-none">
                    <th className="py-3 px-6 h-10">Rank</th>
                    <th className="py-3 px-4 h-10">Participant Info</th>
                    <th className="py-3 px-4 h-10">Acquisition Source</th>
                    <th className="py-3 px-4 h-10 text-center">Guesses Count</th>
                    <th className="py-3 px-4 h-10 text-center">Correct Predictions</th>
                    <th className="py-3 px-6 h-10 text-right">Points Accumulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-sans">
                  {filteredStandings.map((row, idx) => {
                    const isTopThreeRank = idx < 3;
                    return (
                      <tr key={row.id} className="hover:bg-slate-900/10 transition group text-xs text-slate-300">
                        <td className="py-4 px-6 font-mono font-bold">
                          {isTopThreeRank ? (
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xxs ${
                              idx === 0 ? 'bg-yellow-500/10 text-yellow-400' :
                              idx === 1 ? 'bg-slate-450/15 text-slate-300' :
                              'bg-amber-600/10 text-amber-500'
                            }`}>
                              #{idx + 1}
                            </span>
                          ) : (
                            <span className="text-slate-500 pl-1">#{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-200 group-hover:text-emerald-400 transition truncate max-w-xs">{row.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.phone} • {row.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md font-mono text-[9px] uppercase font-bold text-slate-400">
                            {row.source}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-400">
                          {row.predictionsSubmitted} / {events.length}
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-slate-200">
                          {row.correctAnswersCount}
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-emerald-400 font-bold whitespace-nowrap">
                          {row.totalPoints} XP
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredStandings.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-500 font-mono">
                No matching participant found in active standings filter.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
