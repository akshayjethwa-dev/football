import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientById } from '../services/firebaseClientService';
import { getCampaignById, createCampaign, updateCampaign } from '../services/firebaseCampaignService';
import { Client, Campaign, CampaignStatus, CampaignEventType, CampaignGameType, ChannelType } from '../types';
import { 
  ArrowLeft, 
  Save, 
  HelpCircle, 
  Settings, 
  Cpu, 
  Sliders, 
  Trophy, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function CampaignFormPage() {
  const { clientId, campaignId } = useParams<{ clientId: string; campaignId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!campaignId;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rewardsDescription, setRewardsDescription] = useState(''); // Added rewards state
  const [eventType, setEventType] = useState<CampaignEventType>('football_world_cup');
  const [gameType, setGameType] = useState<CampaignGameType>('prediction');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('draft');

  // Config fields
  const [correctPoints, setCorrectPoints] = useState(10);
  const [partPoints, setPartPoints] = useState(2);
  const [bonusPoints, setBonusPoints] = useState(5);
  const [maxEvents, setMaxEvents] = useState<number | ''>('');
  const [maxSubmissions, setMaxSubmissions] = useState(1);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [webFormEnabled, setWebFormEnabled] = useState(true);

  // Auto-slug ID from name
  useEffect(() => {
    if (!isEditMode && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setId(slug);
    }
  }, [name, isEditMode]);

  useEffect(() => {
    const fetchData = async () => {
      if (!clientId) return;
      setLoading(true);
      setError(null);
      try {
        const clientDoc = await getClientById(clientId);
        if (!clientDoc) {
          setError(`Parent Client structure with ID "${clientId}" was not found.`);
          setLoading(false);
          return;
        }
        setClient(clientDoc);

        if (isEditMode && campaignId) {
          const camp = await getCampaignById(clientId, campaignId);
          if (camp) {
            setId(camp.id);
            setName(camp.name);
            setDescription(camp.description);
            setRewardsDescription(camp.rewardsDescription || ''); // Load existing rewards text
            setEventType(camp.eventType);
            setGameType(camp.gameType);
            
            // Format ISO date or date string back to YYYY-MM-DD
            if (camp.startDate) setStartDate(camp.startDate.substring(0, 10));
            if (camp.endDate) setEndDate(camp.endDate.substring(0, 10));
            setStatus(camp.status);

            // Config parsing fallback
            if (camp.config) {
              const { scoringRules, maxEventsPerParticipant, maxSubmissionsPerEvent, channelsEnabled } = camp.config;
              if (scoringRules) {
                setCorrectPoints(scoringRules.correctPredictionPoints ?? 10);
                setPartPoints(scoringRules.participationPoints ?? 2);
                setBonusPoints(scoringRules.bonusPoints ?? 5);
              }
              setMaxEvents(maxEventsPerParticipant ?? '');
              setMaxSubmissions(maxSubmissionsPerEvent ?? 1);
              setWhatsappEnabled(channelsEnabled?.includes('whatsapp') ?? false);
              setWebFormEnabled(channelsEnabled?.includes('web_form') ?? false);
            }
          } else {
            setError(`Campaign with ID "${campaignId}" not found under this tenant.`);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError("Error communicating with servers while pulling context details.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId, campaignId, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    if (!id.trim()) {
      alert("A unique Campaign identifier is required.");
      return;
    }

    if (!name.trim()) {
      alert("Campaign Name required.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please designate start and end validation dates.");
      return;
    }

    // Build lists of enabled channels
    const channelsEnabled: ChannelType[] = [];
    if (whatsappEnabled) channelsEnabled.push('whatsapp');
    if (webFormEnabled) channelsEnabled.push('web_form');

    if (channelsEnabled.length === 0) {
      alert("At least one entry channel (e.g. Web Form or WhatsApp) must be activated.");
      return;
    }

    const campaignPayload: Omit<Campaign, 'createdAt' | 'updatedAt'> = {
      id: id.trim(),
      clientId,
      name: name.trim(),
      description: description.trim(),
      rewardsDescription: rewardsDescription.trim() || undefined, // Include in payload
      eventType,
      gameType,
      startDate,
      endDate,
      status,
      config: {
        scoringRules: {
          correctPredictionPoints: Number(correctPoints),
          participationPoints: Number(partPoints),
          bonusPoints: Number(bonusPoints)
        },
        maxEventsPerParticipant: maxEvents === '' ? undefined : Number(maxEvents),
        maxSubmissionsPerEvent: Number(maxSubmissions),
        channelsEnabled
      }
    };

    setSaving(true);
    try {
      if (isEditMode) {
        // Exclude ID from updates, just send dynamic modifications
        const { id: _, clientId: __, ...updateFields } = campaignPayload;
        await updateCampaign(clientId, id, updateFields);
      } else {
        await createCampaign(clientId, campaignPayload);
      }
      navigate(`/admin/clients/${clientId}/campaigns`);
    } catch (err: any) {
      console.error(err);
      alert(`Communication interrupted: ${err.message || 'Check firestore parameters & index constraints'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 space-y-3">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-400 font-mono text-xs uppercase">EVALUATING SCHEMES & RECORDS...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-rose-400 font-bold block">Invalid Workflow Path</p>
        <p className="text-xs text-slate-400">{error || 'Missing client parameters.'}</p>
        <button
          onClick={() => navigate('/admin/clients')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Clients Scope
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Upper header action layout */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/admin/clients/${clientId}/campaigns`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-2 group transition"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            <span>Return to {client.name} Campaigns</span>
          </button>
          
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isEditMode ? 'Modify Campaign Context' : 'Draft Campaign Instance'}
          </h1>
          <p className="text-slate-400 text-sm">
            Associate gamification rulesets, scoring metrics, and channel gateways with {client.name}.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Core details layout */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
            <Cpu className="text-emerald-400 h-5 w-5" />
            <h2 className="text-md font-bold text-white uppercase tracking-wider font-sans">Core Specifications</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Campaign Moniker / Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., FIFA Qatar World Cup Predictions"
                className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full px-4 py-3 rounded-xl placeholder-slate-705 text-sm"
              />
            </div>

            <div className="space-y-1.5 col-span-1">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Functional Slug/ID (System Primary Key) *
              </label>
              <input
                type="text"
                required
                disabled={isEditMode}
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="slug-id-format"
                className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-300 disabled:opacity-50 block w-full px-4 py-3 rounded-xl font-mono text-xs placeholder-slate-705"
              />
              {!isEditMode && (
                <span className="text-[10px] text-slate-500">
                  Letters, numbers, and dashes only. Automatically sluggified from name.
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Deployment State *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="bg-slate-950 border border-slate-800 text-slate-300 block w-full px-4 py-3 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="draft">📁 Draft State - Closed to public</option>
                <option value="active">🟢 Active Running - Interactive on WhatsApp/Web</option>
                <option value="archived">📦 Archived Historical - Read-only results</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Parent Event Theme / Motif *
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as CampaignEventType)}
                className="bg-slate-950 border border-slate-800 text-slate-300 block w-full px-4 py-3 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="football_world_cup">⚽ Football Tournament (World Cup, UEFA)</option>
                <option value="cricket">🏏 Cricket Tournament (IPL, T20, ICC)</option>
                <option value="festival">🎉 Holiday / Festival Season (Christmas, Festive)</option>
                <option value="custom">⚙️ Custom Business Event / Milestone</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Game Flow Mechanics *
              </label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as CampaignGameType)}
                className="bg-slate-950 border border-slate-800 text-slate-300 block w-full px-4 py-3 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500"
              >
                <option value="prediction">🎯 Result/Score Prediction Engine</option>
                <option value="quiz">🧠 Trivia Quiz & Knowledge Matrix</option>
                <option value="referral">👥 Affiliate Referral Rewards</option>
                <option value="mixed">💫 Hybrid Campaign / Mixed Engagement</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Engagement Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-3 rounded-xl focus:ring-emerald-500 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Engagement Expiration Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-3 rounded-xl focus:ring-emerald-500 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                Explanatory Summary / Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Summarize the reward rules, predictive elements, and schedules..."
                className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full px-4 py-3 rounded-xl placeholder-slate-705 text-sm"
              />
            </div>

            {/* NEW: Rewards Description Input */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xxs uppercase font-mono font-bold text-emerald-400">
                Rewards & Prize Pitch (Optional)
              </label>
              <textarea
                value={rewardsDescription}
                onChange={(e) => setRewardsDescription(e.target.value)}
                rows={2}
                placeholder="e.g., Top the leaderboard to win a 50% OFF coupon on all pizzas!"
                className="bg-emerald-950/20 border border-emerald-900/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-emerald-100 block w-full px-4 py-3 rounded-xl placeholder-emerald-900/50 text-sm"
              />
              <span className="text-[10px] text-slate-500">
                If provided, this text will display prominently on the public landing page to motivate participants.
              </span>
            </div>
          </div>
        </div>

        {/* Configuration rules layout (scoring, etc.) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-850 pb-4">
            <Sliders className="text-emerald-400 h-5 w-5" />
            <h2 className="text-md font-bold text-white uppercase tracking-wider font-sans">Campaign Ruleset Configurations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Scoring Section */}
            <div className="md:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono">Dynamic Point Matrices</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4.5 rounded-xl border border-slate-850">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold font-mono uppercase mb-1">
                    Correct Prediction Points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={correctPoints}
                    onChange={(e) => setCorrectPoints(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white block w-full px-3.5 py-2.5 rounded-lg text-xs font-mono focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold font-mono uppercase mb-1">
                    Submission/Participation Points
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={partPoints}
                    onChange={(e) => setPartPoints(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white block w-full px-3.5 py-2.5 rounded-lg text-xs font-mono focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold font-mono uppercase mb-1">
                    Streaks/Milestone Bonus
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={bonusPoints}
                    onChange={(e) => setBonusPoints(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white block w-full px-3.5 py-2.5 rounded-lg text-xs font-mono focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Campaign Boundaries */}
            <div className="md:col-span-3 space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono">Capacity & Submission Caps</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4.5 rounded-xl border border-slate-850">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold font-mono uppercase mb-1">
                    Max Events Per Participant (Optional)
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited bounds"
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(e.target.value === '' ? '' : Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white block w-full px-3.5 py-2.5 rounded-lg text-xs font-mono focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-550 block mt-1">
                    Leave blank to allow participants to play every match in the campaign.
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold font-mono uppercase mb-1">
                    Max Submissions Per Event
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxSubmissions}
                    onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 text-white block w-full px-3.5 py-2.5 rounded-lg text-xs font-mono focus:ring-emerald-500"
                  />
                  <span className="text-[9px] text-slate-550 block mt-1">
                    Restricts predictions per individual event/match. Recommend: 1.
                  </span>
                </div>
              </div>
            </div>

            {/* Communications Channels */}
            <div className="md:col-span-3 space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono">Active Entry Channels</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 p-4 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-805 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">WhatsApp Conversational Bot</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 max-w-sm">
                      Enable Twilio/Meta WhatsApp webhook mapping. Users participate directly via messaging prompts.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-slate-950 hover:bg-slate-850 border border-slate-850 rounded-xl cursor-pointer transition select-none">
                  <input
                    type="checkbox"
                    checked={webFormEnabled}
                    onChange={(e) => setWebFormEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-805 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Dynamic Web Landing Page</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 max-w-sm">
                      Serve a secure host web portal where clients can authenticate via OTP and input scores.
                    </span>
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Submit action panel */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate(`/admin/clients/${clientId}/campaigns`)}
            className="px-5 py-3 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition"
          >
            Cancel Draft
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-6 py-3 rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Synchronizing...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>Save Campaign Framework</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}