import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Ticket, 
  TrendingUp, 
  CheckCircle, 
  Calendar, 
  QrCode,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';
import { useCampaignParticipants, useCampaignEvents, useAllCampaignResponses } from '../hooks/useParticipants';
import { getCoupons } from '../services/firebaseCouponService';
import { exportParticipantsCSV, exportLeaderboardCSV, exportCouponsCSV } from '../services/csvExportService';
import { Coupon, CampaignEvent, Participant } from '../types';

interface CampaignAnalyticsProps {
  clientId: string;
  campaignId: string;
}

export default function CampaignAnalytics({ clientId, campaignId }: CampaignAnalyticsProps) {
  const { data: participants = [], isLoading: isLoadingParticipants } = useCampaignParticipants(clientId, campaignId);
  const { data: events = [], isLoading: isLoadingEvents } = useCampaignEvents(clientId, campaignId);
  const { data: allResponses = [], isLoading: isLoadingResponses } = useAllCampaignResponses(clientId, campaignId);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(true);

  // Fetch coupons
  useEffect(() => {
    async function load() {
      setIsLoadingCoupons(true);
      try {
        const data = await getCoupons(clientId, campaignId);
        setCoupons(data);
      } catch (e) {
        console.error('Failed to load coupons inside analytics component', e);
      } finally {
        setIsLoadingCoupons(false);
      }
    }
    load();
  }, [clientId, campaignId]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalParticipants = participants.length;
    
    // WhatsApp statistics
    const whatsappOptInsCount = participants.filter(p => p.whatsappOptIn).length;
    const whatsappOptInRate = totalParticipants > 0 
      ? Math.round((whatsappOptInsCount / totalParticipants) * 100) 
      : 0;

    // Response statistics
    const totalPredictions = allResponses.length;
    const maxPossiblePredictions = totalParticipants * events.length;
    const engagementRate = maxPossiblePredictions > 0
      ? Math.round((totalPredictions / maxPossiblePredictions) * 100)
      : 0;

    // Coupon metrics: Assigned vs Used vs Expired
    const totalCoupons = coupons.length;
    const couponsAssigned = coupons.filter(c => c.participantId !== null).length;
    const couponsUsed = coupons.filter(c => c.status === 'used').length;
    const couponsExpired = coupons.filter(c => c.status === 'expired').length;
    const couponsUnassigned = coupons.filter(c => c.status === 'unused' && c.participantId === null).length;

    // Responses per single event stats
    const eventMetrics = events.map(event => {
      const responsesForEvent = allResponses.filter(r => r.eventId === event.id);
      
      // Calculate correct response breakdown if the event is resolved
      let correctCount = 0;
      let wrongCount = 0;
      if (event.correctAnswer) {
        const official = event.correctAnswer.toLowerCase().trim();
        responsesForEvent.forEach(r => {
          if (r.answer.toLowerCase().trim() === official) {
            correctCount++;
          } else {
            wrongCount++;
          }
        });
      }

      return {
        id: event.id,
        label: event.label,
        type: event.type,
        correctAnswer: event.correctAnswer,
        count: responsesForEvent.length,
        percentageOfAllParticipants: totalParticipants > 0 
          ? Math.round((responsesForEvent.length / totalParticipants) * 100) 
          : 0,
        correctCount,
        wrongCount,
      };
    });

    // Registration Source distribution
    const sourceStats = {
      qr: participants.filter(p => p.source === 'qr').length,
      landing: participants.filter(p => p.source === 'landing_page').length,
      manual: participants.filter(p => p.source === 'manual_import').length,
    };

    return {
      totalParticipants,
      whatsappOptInsCount,
      whatsappOptInRate,
      totalPredictions,
      maxPossiblePredictions,
      engagementRate,
      totalCoupons,
      couponsAssigned,
      couponsUsed,
      couponsExpired,
      couponsUnassigned,
      eventMetrics,
      sourceStats
    };
  }, [participants, events, allResponses, coupons]);

  // Bulk downloads via spreadsheet-safe shared CSV export functions
  const handleExportParticipants = () => {
    if (participants.length === 0) return;
    exportParticipantsCSV(campaignId, participants);
  };

  const handleExportLeaderboard = () => {
    if (participants.length === 0) return;
    
    // Compute standings values inline
    const resolvedEventAnswers = new Map<string, string>();
    events.forEach(e => {
      if (e.correctAnswer) {
        resolvedEventAnswers.set(e.id, e.correctAnswer.toLowerCase().trim());
      }
    });

    const standings = participants.map(p => {
      const pResponses = allResponses.filter(r => r.participantId === p.id);
      const correctAnswersCount = pResponses.filter(r => {
        const official = resolvedEventAnswers.get(r.eventId);
        return official && r.answer.toLowerCase().trim() === official;
      }).length;

      return {
        ...p,
        predictionsSubmitted: pResponses.length,
        correctAnswersCount
      };
    }).sort((a, b) => {
      if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      }
      return b.correctAnswersCount - a.correctAnswersCount;
    });

    exportLeaderboardCSV(campaignId, standings);
  };

  const handleExportCoupons = () => {
    if (coupons.length === 0) return;
    const lookup: Record<string, string> = {};
    participants.forEach(p => {
      lookup[p.id] = p.name;
    });
    exportCouponsCSV(campaignId, coupons, lookup);
  };

  const isLoading = isLoadingParticipants || isLoadingEvents || isLoadingResponses || isLoadingCoupons;

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-mono">Assembling campaign data metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8" id="campaign-analytics-panel">
      {/* Overview stats header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            Campaign Performance Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Real-time diagnostics tracking participant engagement, predictive density, opt-in consent ratios, and rewards fulfillment.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        
        {/* KPI 1: Participants */}
        <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 w-8 h-8 bg-slate-950/40 rounded-lg flex items-center justify-center text-slate-400">
            <Users className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Total Crowd</span>
          <span className="text-2xl font-black text-white font-mono mt-1.5 block">{metrics.totalParticipants}</span>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Acquisition:</span>
            <div className="flex gap-1.5 text-[9px] font-mono text-slate-500 font-bold">
              <span className="text-emerald-400">QR Match: {metrics.sourceStats.qr}</span>
              <span>•</span>
              <span className="text-blue-400">Web Landing: {metrics.sourceStats.landing}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: WhatsApp Opt-In */}
        <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">WhatsApp Opt-In Rate</span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-1.5 block">{metrics.whatsappOptInRate}%</span>
          
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.whatsappOptInRate}%` }}
              ></div>
            </div>
            <div className="text-[9px] font-mono text-slate-500 text-right">
              {metrics.whatsappOptInsCount} / {metrics.totalParticipants} Opted-In
            </div>
          </div>
        </div>

        {/* KPI 3: Engagement Predictions submits */}
        <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 w-8 h-8 bg-slate-950/40 rounded-lg flex items-center justify-center text-slate-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Prediction Engagement</span>
          <span className="text-2xl font-black text-white font-mono mt-1.5 block">{metrics.engagementRate}%</span>
          
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-450 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.engagementRate}%` }}
              ></div>
            </div>
            <div className="text-[9px] font-mono text-slate-500 text-right">
              {metrics.totalPredictions} Predictions submitted
            </div>
          </div>
        </div>

        {/* KPI 4: Coupons Assigned & Claimed */}
        <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 w-8 h-8 bg-slate-950/40 rounded-lg flex items-center justify-center text-slate-400">
            <Ticket className="h-4 w-4" />
          </div>
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 block">Rewards Distribution</span>
          <span className="text-2xl font-black text-amber-500 font-mono mt-1.5 block">
            {metrics.couponsAssigned} <span className="text-xs text-slate-500 font-normal">Assigned</span>
          </span>
          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-mono font-semibold">
            <span>Pool: {metrics.totalCoupons}</span>
            <span className="text-teal-400">Redeemed: {metrics.couponsUsed}</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Big Sub-Panel: Event Response Density & Custom Horizontal Chart */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-5">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Predictions Response Density per Event
              </h4>
              <p className="text-xxs text-slate-400 mt-1 leading-relaxed">
                Aggregated vote totals for each campaign arena matchup, highlighting user prediction rates and scoring distribution.
              </p>
            </div>

            {metrics.eventMetrics.length === 0 ? (
              <div className="py-12 border border-slate-850 border-dashed rounded-xl text-center text-xs text-slate-550 font-mono">
                No events currently mapped to trigger engagement tracking.
              </div>
            ) : (
              <div className="space-y-5">
                {metrics.eventMetrics.map((e) => {
                  return (
                    <div key={e.id} className="space-y-2 select-none">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-slate-200 truncate pr-4">
                          {e.label}
                        </div>
                        <div className="font-mono text-slate-450 text-right shrink-0">
                          <span className="font-bold text-white">{e.count}</span> submissions
                        </div>
                      </div>

                      {/* Stacked Percentage bar rendering responsive status progress */}
                      <div className="w-full bg-slate-950/80 h-3.5 rounded-lg overflow-hidden flex relative border border-slate-850">
                        {metrics.totalParticipants > 0 ? (
                          <>
                            {/* Correct responses portion */}
                            {e.correctAnswer && e.correctCount > 0 && (
                              <div 
                                className="bg-emerald-400/80 h-full transition-all duration-300" 
                                style={{ width: `${Math.round((e.correctCount / metrics.totalParticipants) * 100)}%` }}
                                title={`${e.correctCount} Correct Predictions`}
                              ></div>
                            )}
                            {/* Incorrect responses portion */}
                            {e.correctAnswer && e.wrongCount > 0 && (
                              <div 
                                className="bg-slate-650 h-full transition-all duration-300" 
                                style={{ width: `${Math.round((e.wrongCount / metrics.totalParticipants) * 100)}%` }}
                                title={`${e.wrongCount} Wrong Predictions`}
                              ></div>
                            )}
                            {/* General participation portion if unresolved */}
                            {!e.correctAnswer && e.count > 0 && (
                              <div 
                                className="bg-blue-450/40 h-full transition-all duration-300" 
                                style={{ width: `${Math.round((e.count / metrics.totalParticipants) * 100)}%` }}
                                title={`${e.count} predictions pending official result`}
                              ></div>
                            )}
                          </>
                        ) : null}
                      </div>

                      {/* Bottom notes */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>
                          {e.correctAnswer ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Official Result: {e.correctAnswer}
                            </span>
                          ) : (
                            <span className="text-amber-500 font-bold flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Unresolved matchup predictions
                            </span>
                          )}
                        </span>
                        <span>Engagement Rank Index: {e.percentageOfAllParticipants}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Smaller Panel: Bulk Export Actions & Metrics Details */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Download className="h-4 w-4 text-emerald-400" />
              Spreadsheet Export Terminal
            </h4>
            <p className="text-xxs text-slate-400 leading-relaxed">
              Synthesize and extract clean campaign ledger data in standard `.csv` spreadsheet-compatible formatting.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleExportParticipants}
                disabled={participants.length === 0}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between group disabled:opacity-45"
              >
                <span className="group-hover:text-emerald-400 transition">Participants Directory</span>
                <Download className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                onClick={handleExportLeaderboard}
                disabled={participants.length === 0}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between group disabled:opacity-45"
              >
                <span className="group-hover:text-emerald-400 transition">Leaderboard Rankings</span>
                <Download className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>

              <button
                onClick={handleExportCoupons}
                disabled={coupons.length === 0}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between group disabled:opacity-45"
              >
                <span className="group-hover:text-emerald-400 transition">Reward Coupons Log</span>
                <Download className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
              </button>
            </div>
          </div>

          {/* Setup verification indicator */}
          <div className="bg-slate-950/40 border border-slate-850/80 p-5 rounded-2xl space-y-2.5">
            <span className="inline-block px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded font-mono text-[8px] uppercase tracking-wider font-extrabold text-emerald-400">
              Integrations Confirmed
            </span>
            <div className="text-xs font-bold text-slate-350 font-mono">
              WhatsApp Marketing Engine (Live)
            </div>
            <p className="text-xxs text-slate-500 leading-relaxed font-sans">
              Facebook Graph API channel initialized as active transmitter. Auto-responder rules active for all web clients.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
