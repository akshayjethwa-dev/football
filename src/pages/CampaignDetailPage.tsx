import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClientById } from '../services/firebaseClientService';
import { getCampaignById } from '../services/firebaseCampaignService';
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent 
} from '../services/firebaseEventService';
import { useCampaignParticipants } from '../hooks/useParticipants';
import { useSendReminderMessage } from '../hooks/useWhatsApp';
import { useScoreEvent } from '../hooks/useScoring';
import CampaignLeaderboard from '../components/CampaignLeaderboard';
import CouponManager from '../components/CouponManager';
import CampaignAnalytics from '../components/CampaignAnalytics';
import { Client, Campaign, CampaignEvent, CampaignEventTypeMatchOrQuestion, EventMetadata } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Trophy, 
  Ticket,
  CheckCircle, 
  Trash2, 
  Edit, 
  RefreshCw, 
  X, 
  Clock, 
  Briefcase, 
  Layers, 
  Tag, 
  HelpCircle,
  FileText,
  AlertCircle,
  Award,
  Zap,
  Check,
  Percent,
  Users,
  Download,
  BarChart3
} from 'lucide-react';

export default function CampaignDetailPage() {
  const { clientId, campaignId } = useParams<{ clientId: string; campaignId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, resolved, un-resolved

  // Tab controller states
  const [activeTab, setActiveTab] = useState<'events' | 'participants' | 'leaderboard' | 'rewards' | 'analytics'>('events');
  const scoreEventMutation = useScoreEvent();
  const [participantSearch, setParticipantSearch] = useState('');

  // Fetch campaign participants database
  const { data: participants = [], isLoading: isParticipantsLoading } = useCampaignParticipants(clientId, campaignId);

  const sendReminder = useSendReminderMessage();
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const handleTriggerReminder = async (p: any) => {
    if (!campaign) return;
    try {
      setRemindingId(p.id);
      await sendReminder.mutateAsync({
        recipientPhone: p.phone,
        name: p.name,
        eventLabel: events[0]?.label || "Next Arena Phase",
        closesInHours: 24,
        campaignId: campaign.id
      });
      alert(`WhatsApp mock/live confirmation message dispatched to ${p.name}!`);
    } catch (e: any) {
      alert(`Failed to trigger WhatsApp webhook/message: ${e.message || e}`);
    } finally {
      setRemindingId(null);
    }
  };

  // Manage Match/Question Modal/Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CampaignEvent | null>(null);

  // Form Fields State
  const [eventIdInput, setEventIdInput] = useState('');
  const [eventTypeInput, setEventTypeInput] = useState<CampaignEventTypeMatchOrQuestion>('match');
  const [eventLabelInput, setEventLabelInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  
  // Metadata fields
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [groupName, setGroupName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [choicesRaw, setChoicesRaw] = useState(''); // comma-separated choices for trivia questions

  // Scoring config fields (Fixed TS Types here)
  const [overrideScoring, setOverrideScoring] = useState(false);
  const [correctPointsOverride, setCorrectPointsOverride] = useState<number | ''>('');
  const [participationPointsOverride, setParticipationPointsOverride] = useState<number | ''>('');

  // Manage quick result recording modal
  const [recordingResultEvent, setRecordingResultEvent] = useState<CampaignEvent | null>(null);
  const [customResultInput, setCustomResultInput] = useState('');

  const loadAllData = async () => {
    if (!clientId || !campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const clientDoc = await getClientById(clientId);
      if (!clientDoc) {
        setError(`Client tenant context "${clientId}" not resolved.`);
        setLoading(false);
        return;
      }
      setClient(clientDoc);

      const campaignDoc = await getCampaignById(clientId, campaignId);
      if (!campaignDoc) {
        setError(`Campaign structure "${campaignId}" not found for client.`);
        setLoading(false);
        return;
      }
      setCampaign(campaignDoc);

      const eventsList = await getEvents(clientId, campaignId);
      setEvents(eventsList);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch historical events/questions under this campaign.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [clientId, campaignId]);

  // Sluggify event identifier if in create mode
  useEffect(() => {
    if (!editingEvent && eventLabelInput) {
      const slug = eventLabelInput
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setEventIdInput(slug);
    }
  }, [eventLabelInput, editingEvent]);

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setEventIdInput('');
    setEventTypeInput('match');
    setEventLabelInput('');
    
    // Set default start/end times based on campaign context if available
    const today = new Date().toISOString().substring(0, 16);
    setStartTimeInput(today);
    setEndTimeInput(today);

    setTeamA('');
    setTeamB('');
    setGroupName('');
    setImageUrl('');
    setChoicesRaw('');
    setOverrideScoring(false);
    setCorrectPointsOverride('');
    setParticipationPointsOverride('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (evt: CampaignEvent) => {
    setEditingEvent(evt);
    setEventIdInput(evt.id);
    setEventTypeInput(evt.type);
    setEventLabelInput(evt.label);
    
    // ISO string handling back to local datetime
    setStartTimeInput(evt.startTime ? evt.startTime.substring(0, 16) : '');
    setEndTimeInput(evt.endTime ? evt.endTime.substring(0, 16) : '');

    setTeamA(evt.metadata.teamA || '');
    setTeamB(evt.metadata.teamB || '');
    setGroupName(evt.metadata.group || '');
    setImageUrl(evt.metadata.imageUrl || '');
    setChoicesRaw(evt.metadata.choices ? evt.metadata.choices.join(', ') : '');

    if (evt.scoringConfig && (evt.scoringConfig.correctPoints !== undefined || evt.scoringConfig.participationPoints !== undefined)) {
      setOverrideScoring(true);
      setCorrectPointsOverride(evt.scoringConfig.correctPoints ?? '');
      setParticipationPointsOverride(evt.scoringConfig.participationPoints ?? '');
    } else {
      setOverrideScoring(false);
      setCorrectPointsOverride('');
      setParticipationPointsOverride('');
    }

    setIsFormOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !campaignId) return;

    if (!eventIdInput.trim()) {
      alert("A unique Event identification key is mandatory.");
      return;
    }

    if (!eventLabelInput.trim()) {
      alert("The Event Label name is required.");
      return;
    }

    // Validation for start/end times (end >= start)
    const startVal = new Date(startTimeInput);
    const endVal = new Date(endTimeInput);
    if (endVal < startVal) {
      alert("Temporal validation error: The submission window end date/time must be greater than or equal to the start date/time.");
      return;
    }

    // Construct metadata
    const metadata: EventMetadata = {};
    if (eventTypeInput === 'match') {
      metadata.teamA = teamA.trim();
      metadata.teamB = teamB.trim();
      metadata.group = groupName.trim();
      if (imageUrl.trim()) metadata.imageUrl = imageUrl.trim();
    } else {
      // Split choices by comma, filter out empty elements
      metadata.choices = choicesRaw
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
    }

    // Scoring config overrides
    const scoringConfigInput = overrideScoring ? {
      correctPoints: correctPointsOverride !== '' ? Number(correctPointsOverride) : undefined,
      participationPoints: participationPointsOverride !== '' ? Number(participationPointsOverride) : undefined,
    } : undefined;

    const eventPayload: Omit<CampaignEvent, 'createdAt' | 'updatedAt'> = {
      id: eventIdInput.trim(),
      campaignId,
      type: eventTypeInput,
      label: eventLabelInput.trim(),
      startTime: startTimeInput,
      endTime: endTimeInput,
      metadata,
      correctAnswer: editingEvent ? editingEvent.correctAnswer : null, // keep existing answer
      scoringConfig: scoringConfigInput
    };

    try {
      if (editingEvent) {
        // Exclude ID from dynamic update map
        const { id: _, campaignId: __, ...updateFields } = eventPayload;
        await updateEvent(clientId, campaignId, editingEvent.id, updateFields);
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...updateFields, updatedAt: new Date() } : e));
      } else {
        await createEvent(clientId, campaignId, eventPayload);
        setEvents(prev => [...prev, { ...eventPayload, createdAt: new Date(), updatedAt: new Date() }]);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Firestore synchronization failure: ${err.message || 'Deny permission checks'}`);
    }
  };

  const handleDeleteEvent = async (evtId: string, label: string) => {
    if (!clientId || !campaignId) return;
    if (!window.confirm(`DANGER: Are you sure you want to delete the event/question "${label}"? This is irreversible.`)) {
      return;
    }
    try {
      await deleteEvent(clientId, campaignId, evtId);
      setEvents(prev => prev.filter(e => e.id !== evtId));
    } catch (err: any) {
      console.error(err);
      alert(`Could not complete deletion: ${err.message || 'Check connection'}`);
    }
  };

  const handleOpenResultRecording = (evt: CampaignEvent) => {
    setRecordingResultEvent(evt);
    setCustomResultInput(evt.correctAnswer || '');
  };

  const handleSaveResult = async () => {
    if (!clientId || !campaignId || !recordingResultEvent) return;

    try {
      const finalResult = customResultInput.trim() === '' ? null : customResultInput.trim();
      
      // Update target event correct answer
      await updateEvent(clientId, campaignId, recordingResultEvent.id, {
        correctAnswer: finalResult
      });
      setEvents(prev => prev.map(e => e.id === recordingResultEvent.id ? { ...e, correctAnswer: finalResult } : e));
      
      // Auto-trigger calculation of points scores
      if (finalResult !== null) {
        await scoreEventMutation.mutateAsync({
          clientId,
          campaignId,
          eventId: recordingResultEvent.id,
          correctAnswer: finalResult
        });
      }

      setRecordingResultEvent(null);
    } catch (err: any) {
      console.error(err);
      alert(`Could not record answer and score: ${err.message || 'Check connection settings'}`);
    }
  };

  // Filter list
  const filteredEvents = events.filter(evt => {
    const matchesSearch = evt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          evt.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || evt.type === typeFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'resolved') {
      matchesStatus = evt.correctAnswer !== null;
    } else if (statusFilter === 'un-resolved') {
      matchesStatus = evt.correctAnswer === null;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const getCampaignStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '🟢 Live Active';
      case 'draft': return '📁 Closed Draft';
      case 'archived': return '📦 Archived';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 space-y-3">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-400 font-mono text-xs uppercase">Resolving campaign events matrix...</span>
      </div>
    );
  }

  if (error || !campaign || !client) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-rose-400 font-semibold text-lg">Error Resolving Campaign</p>
        <p className="text-slate-400 text-xs">{error || 'Campaign metadata structures missing.'}</p>
        <button
          onClick={() => navigate('/admin/clients')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients Scope
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Upper header block navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/admin/clients/${clientId}/campaigns`)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-2 group transition"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            <span>Return to B2B Campaigns List</span>
          </button>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {campaign.name}
            </h1>
            <span className="text-mini font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold uppercase">
              {getCampaignStatusLabel(campaign.status)}
            </span>
          </div>
          <p className="text-slate-400 text-sm max-w-xl">
            {campaign.description || 'Custom predictions engine ruleset configured.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadAllData}
            className="p-3 border border-slate-850 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/10 transition"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            <span>New Event / Question</span>
          </button>
        </div>
      </div>

      {/* Inner Information metrics panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="space-y-1 md:border-r border-slate-850 pr-4 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Client Host Details</p>
          <p className="text-sm font-bold text-white mt-1.5">{client.name}</p>
          <p className="text-mini text-slate-400 truncate">Contact Person: {client.contactPerson}</p>
          <p className="text-xxs font-mono text-slate-500 mt-1 uppercase">SENDER: {client.senderNumber || 'Twilio config missing'}</p>
        </div>

        <div className="space-y-1 md:border-r border-slate-850 pr-4 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Active Gamification parameters</p>
          <div className="flex flex-wrap gap-2.5 mt-2">
            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 text-xxs font-mono rounded">
              🎯 Correct Match: +{campaign.config.scoringRules.correctPredictionPoints} pts
            </span>
            <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 text-xxs font-mono rounded">
              ⚡ Play Participation: +{campaign.config.scoringRules.participationPoints} pts
            </span>
          </div>
        </div>

        <div className="space-y-1 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Active Events Index Balance</p>
          <p className="text-2xl font-black font-mono text-white mt-1.5">
            {events.length} <span className="text-xs text-slate-500 font-sans font-normal">Active Triggers</span>
          </p>
          <div className="flex gap-3 text-[10px] text-slate-400 mt-1">
            <span className="text-emerald-400/90 font-semibold font-mono">
              RESOLVED: {events.filter(e => e.correctAnswer !== null).length}
            </span>
            <span>•</span>
            <span className="text-yellow-400/90 font-semibold font-mono">
              PENDING: {events.filter(e => e.correctAnswer === null).length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="space-y-5">
        <div className="border-b border-slate-850 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-3 border-b-2 transition ${
                activeTab === 'events'
                  ? 'border-emerald-400 text-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Layers className={`h-4 w-4 ${activeTab === 'events' ? 'text-emerald-400' : 'text-slate-550'}`} />
              <span>Events & Prediction Questions Setup</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('participants')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-3 border-b-2 transition ${
                activeTab === 'participants'
                  ? 'border-emerald-400 text-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Users className={`h-4 w-4 ${activeTab === 'participants' ? 'text-emerald-400' : 'text-slate-550'}`} />
              <span>Participants Directory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-3 border-b-2 transition ${
                activeTab === 'leaderboard'
                  ? 'border-emerald-400 text-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Trophy className={`h-4 w-4 ${activeTab === 'leaderboard' ? 'text-emerald-400' : 'text-slate-550'}`} />
              <span>Leaderboard Standings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rewards')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-3 border-b-2 transition ${
                activeTab === 'rewards'
                  ? 'border-emerald-400 text-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <Ticket className={`h-4 w-4 ${activeTab === 'rewards' ? 'text-emerald-400' : 'text-slate-550'}`} />
              <span>Coupons & Rewards</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-3 border-b-2 transition ${
                activeTab === 'analytics'
                  ? 'border-emerald-400 text-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-350'
              }`}
            >
              <BarChart3 className={`h-4 w-4 ${activeTab === 'analytics' ? 'text-emerald-400' : 'text-slate-550'}`} />
              <span>Performance Analytics</span>
            </button>
          </div>
        </div>

        {activeTab === 'events' ? (
          <>
            {/* Filters and search box */}
        <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col lg:flex-row gap-3.5 items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search event label, team monikers or identifier slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full pl-9 pr-4 py-2 rounded-xl text-xs placeholder-slate-700 font-mono"
            />
          </div>

          <div className="flex gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-850 rounded-xl w-full sm:w-auto">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">All Match Types</option>
                <option value="match">🥇 Sports Matchup</option>
                <option value="question">🧠 Custom Trivia Question</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-850 rounded-xl w-full sm:w-auto font-mono">
              <Award className="h-3.5 w-3.5 text-emerald-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">All Outcomes</option>
                <option value="resolved">🟢 Resolved / Results Set</option>
                <option value="un-resolved">🟡 Pending Outcomes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid representations of items */}
        {filteredEvents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850/80 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="h-12 w-12 rounded-xl bg-slate-850 mx-auto flex items-center justify-center text-slate-500">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-white font-bold text-md">No Games/Questions Bound Yet</p>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Create events, schedule kickoff windows, and publish prediction prompts for participants under this campaign.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="h-4.5 w-4.5" /> Initialize First Event Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-850 bg-slate-950/40 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  <th className="py-4.5 px-6 font-bold">Label & System-ID</th>
                  <th className="py-4.5 px-4 font-bold">Activity Type</th>
                  <th className="py-4.5 px-4 font-bold">Submission Bracket Window</th>
                  <th className="py-4.5 px-4 font-bold col">Correct Answer / Status</th>
                  <th className="py-4.5 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-sm">
                {filteredEvents.map((evt) => {
                  const now = new Date();
                  const startWindow = new Date(evt.startTime);
                  const endWindow = new Date(evt.endTime);
                  const isWindowClosed = now > endWindow;
                  const isUpcoming = now < startWindow;
                  const isWindowActive = !isUpcoming && !isWindowClosed;

                  return (
                    <tr key={evt.id} className="hover:bg-slate-850/20 transition">
                      <td className="py-4.5 px-6">
                        <div className="space-y-1">
                          <p className="font-bold text-white font-sans">{evt.label}</p>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                            <span>ID: {evt.id}</span>
                            {evt.metadata.group && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500/80 uppercase font-semibold">{evt.metadata.group}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-4">
                        {evt.type === 'match' ? (
                          <div className="space-y-0.5">
                            <span className="inline-block bg-indigo-500/15 text-indigo-400 border border-indigo-500/10 font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              ⚽ Matchup
                            </span>
                            <p className="text-xxs text-slate-400">
                              {evt.metadata.teamA} vs {evt.metadata.teamB}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-block bg-purple-500/15 text-purple-400 border border-purple-500/10 font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase">
                              🧠 Trivia Quiz
                            </span>
                            <p className="text-xxs text-slate-500 truncate max-w-37.5">
                              {evt.metadata.choices ? `${evt.metadata.choices.length} choices` : 'Free text'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-4.5 px-4 font-mono text-xxs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-slate-350">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span>
                              {evt.startTime.substring(0, 10)} {evt.startTime.substring(11, 16)} —{' '}
                              {evt.endTime.substring(0, 10)} {evt.endTime.substring(11, 16)}
                            </span>
                          </div>
                          <div>
                            {isWindowClosed ? (
                              <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded font-semibold border border-rose-500/15 uppercase">
                                Closed (Gated)
                              </span>
                            ) : isUpcoming ? (
                              <span className="text-[9px] bg-slate-850 text-slate-450 px-1.5 py-0.5 rounded border border-slate-800 uppercase">
                                Scheduled
                              </span>
                            ) : (
                              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/20 uppercase animate-pulse">
                                Active Bracket Open
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-4">
                        {evt.correctAnswer !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded font-mono text-xs font-bold">
                              {evt.correctAnswer}
                            </span>
                            <button
                              onClick={() => handleOpenResultRecording(evt)}
                              className="text-[10px] text-slate-500 hover:text-white underline"
                            >
                              Reset
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xxs font-mono text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 font-semibold uppercase animate-pulse">
                              Pending Outcome
                            </span>
                            <button
                              onClick={() => handleOpenResultRecording(evt)}
                              className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-sans font-bold text-xxs rounded transition whitespace-nowrap"
                            >
                              Set Result
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 text-slate-400">
                          {evt.scoringConfig && (
                            <span 
                              className="mr-2 text-[9px] font-semibold font-mono bg-pink-500/10 border border-pink-500/15 text-pink-400 px-1.5 py-0.5 rounded uppercase"
                              title="Config Overridden"
                            >
                              Override
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(evt)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg transition"
                            title="Edit parameters/dates"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(evt.id, evt.label)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-rose-900/40 hover:text-rose-450 rounded-lg transition"
                            title="Delete permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
          </>
        ) : activeTab === 'participants' ? (
          <div className="space-y-4">
            {/* Filters, search and export button */}
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search participants by name or phone..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full pl-9 pr-4 py-2 rounded-xl text-xs placeholder-slate-700 font-mono"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['id', 'name', 'phone', 'email', 'source', 'whatsappOptIn', 'totalPoints', 'createdAt'];
                    const rows = participants.filter(p => {
                      const term = participantSearch.toLowerCase();
                      return p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term);
                    }).map(p => [
                      p.id,
                      p.name,
                      p.phone,
                      p.email || '',
                      p.source,
                      p.whatsappOptIn ? 'true' : 'false',
                      p.totalPoints || 0,
                      new Date(p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt).toISOString()
                    ]);

                    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
                      + [headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
                    
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `campaign_${campaign.id}_participants.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  disabled={participants.length === 0}
                  className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 disabled:bg-slate-850 disabled:text-slate-500 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>

            {isParticipantsLoading ? (
              <div className="flex flex-col items-center justify-center min-h-62.5 space-y-2">
                <svg className="animate-spin h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-slate-400 font-mono text-xxs uppercase">Loading participant registry...</span>
              </div>
            ) : participants.filter(p => {
              const term = participantSearch.toLowerCase();
              return p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term);
            }).length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-850 rounded-2xl space-y-3">
                <Users className="h-10 w-10 text-slate-650 mx-auto" />
                <h3 className="text-slate-300 font-bold font-sans text-sm">No Participants Found</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">
                  {participants.length === 0 
                    ? "Nobody has registered for this brand campaign yet. Share the public landing page with fans!"
                    : "No participant directory matches your active search queries."}
                </p>
                {participants.length === 0 && (
                  <div className="pt-2">
                    <a
                      href={`/c/${campaign.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-755 text-slate-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1 transition"
                    >
                      Open Landing Page
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-850 text-xxs uppercase tracking-wider font-mono text-slate-400">
                      <th className="py-4 px-6 font-bold font-mono">Participant Name</th>
                      <th className="py-4 px-4 font-bold font-mono">Phone Number</th>
                      <th className="py-4 px-4 font-bold font-mono">Email Address</th>
                      <th className="py-4 px-4 font-bold font-mono">Source Channel</th>
                      <th className="py-4 px-4 font-bold font-mono text-center">whatsapp OptIn</th>
                      <th className="py-4 px-4 font-bold font-mono text-right">Points</th>
                      <th className="py-4 px-6 font-bold font-mono text-right">Registered</th>
                      <th className="py-4 px-4 font-bold font-mono text-center">Trigger Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                    {participants.filter(p => {
                      const term = participantSearch.toLowerCase();
                      return p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term);
                    }).map((p) => {
                      const computedDate = p.createdAt?.seconds 
                        ? new Date(p.createdAt.seconds * 1000) 
                        : (p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt));
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-850/10 transition">
                          <td className="py-4 px-6">
                            <div className="font-bold text-white text-sm">{p.name}</div>
                            <div className="text-xxs font-mono text-slate-500">ID: {p.id}</div>
                          </td>
                          <td className="py-4 px-4 font-mono">{p.phone}</td>
                          <td className="py-4 px-4 truncate max-w-37.5">{p.email || <span className="text-slate-650">—</span>}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.source === 'landing_page' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : p.source === 'qr'
                                  ? 'bg-indigo-500/10 text-indigo-400'
                                  : 'bg-slate-800 text-slate-350'
                            }`}>
                              {p.source}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {p.whatsappOptIn ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#10b981]/15 text-[#10b981] uppercase">
                                Enabled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-500 uppercase">
                                Disabled
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white text-sm">
                            {p.totalPoints || 0}
                          </td>
                          <td className="py-4 px-6 text-right font-mono text-[10px] text-slate-500">
                            {computedDate.toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              disabled={!p.whatsappOptIn || remindingId !== null}
                              onClick={() => handleTriggerReminder(p)}
                              className={`px-3 py-1.5 rounded-lg text-xxs font-extrabold uppercase tracking-wider inline-flex items-center gap-1 transition ${
                                p.whatsappOptIn
                                  ? remindingId === p.id
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-mono animate-pulse'
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 cursor-pointer'
                                  : 'bg-slate-800 text-slate-650 border border-slate-850 cursor-not-allowed opacity-50'
                              }`}
                              title={p.whatsappOptIn ? "Send custom prediction lock notification" : "User opted out of WhatsApp"}
                            >
                              <Zap className="h-3 w-3 shrink-0" />
                              <span>{remindingId === p.id ? 'Sending...' : 'Remind'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'leaderboard' ? (
          <CampaignLeaderboard clientId={clientId || ''} campaignId={campaignId || ''} />
        ) : activeTab === 'rewards' ? (
          <CouponManager clientId={clientId || ''} campaignId={campaignId || ''} />
        ) : (
          <CampaignAnalytics clientId={clientId || ''} campaignId={campaignId || ''} />
        )}
      </div>

      {/* EVENT FORM OVERLAY SCREEN / SLIDING MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-850 bg-slate-950/20">
              <div className="flex items-center gap-2 text-white">
                <Layers className="h-5 w-5 text-emerald-400" />
                <h3 className="font-extrabold text-md">
                  {editingEvent ? 'Modify Event Framework' : 'Create Event Instance'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Event Type */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Activity Segment Format *
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={() => setEventTypeInput('match')}
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition select-none ${
                        eventTypeInput === 'match'
                          ? 'border-emerald-500/40 bg-emerald-500/5 text-white'
                          : 'border-slate-805 bg-slate-950 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <Trophy className="h-5 w-5" />
                      <span className="text-xs font-bold block">Sports Match Event</span>
                      <span className="text-[10px] text-slate-400 font-sans block leading-tight text-center">
                        e.g., India vs Pakistan cricket prediction
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEventTypeInput('question')}
                      className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition select-none ${
                        eventTypeInput === 'question'
                          ? 'border-emerald-500/40 bg-emerald-500/5 text-white'
                          : 'border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <HelpCircle className="h-5 w-5" />
                      <span className="text-xs font-bold block">Quiz Trivia Poll</span>
                      <span className="text-[10px] text-slate-400 font-sans block leading-tight text-center">
                        Multiple choice general question context
                      </span>
                    </button>
                  </div>
                </div>

                {/* Event Label */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Event Label Moniker *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventLabelInput}
                    onChange={(e) => setEventLabelInput(e.target.value)}
                    placeholder="e.g., Chelsea vs Arsenal Football Prediction"
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full px-4 py-2.5 rounded-xl placeholder-slate-700 text-sm"
                  />
                </div>

                {/* Unique ID ID */}
                <div className="space-y-1.5">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    System Identifier Slug *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingEvent}
                    value={eventIdInput}
                    onChange={(e) => setEventIdInput(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="e.g., chelsea-vs-arsenal"
                    className="bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-50 block w-full px-4 py-2.5 rounded-xl font-mono text-xs placeholder-slate-700"
                  />
                </div>

                {/* Group Label */}
                <div className="space-y-1.5">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Group Stage / Bracket Category
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group A, Finals, Week 1"
                    className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-700"
                  />
                </div>

                {/* Dynamic Metadata according to type */}
                {eventTypeInput === 'match' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                        First Opponent (Team A) *
                      </label>
                      <input
                        type="text"
                        required={eventTypeInput === 'match'}
                        value={teamA}
                        onChange={(e) => setTeamA(e.target.value)}
                        placeholder="e.g., Chelsea"
                        className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                        Second Opponent (Team B) *
                      </label>
                      <input
                        type="text"
                        required={eventTypeInput === 'match'}
                        value={teamB}
                        onChange={(e) => setTeamB(e.target.value)}
                        placeholder="e.g., Arsenal"
                        className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-700"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                      Trivia Answer Choices (Comma-Separated) *
                    </label>
                    <input
                      type="text"
                      required={eventTypeInput === 'question'}
                      value={choicesRaw}
                      onChange={(e) => setChoicesRaw(e.target.value)}
                      placeholder="e.g., Option A, Option B, Option C"
                      className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-700"
                    />
                    <span className="block text-[10px] text-slate-550">
                      Inputs must match individual choice names separated strictly by commas.
                    </span>
                  </div>
                )}

                {/* Start Dates Bracket */}
                <div className="space-y-1.5">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Kickoff / Prediction Window Opens *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Expiration End Dates */}
                <div className="space-y-1.5">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Prediction Window Closes (Submission Gate) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Image URL Optional */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xxs uppercase font-mono font-bold text-slate-400">
                    Graphic illustration Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/promo-banner"
                    className="bg-slate-950 border border-slate-800 text-white block w-full px-4 py-2.5 rounded-xl text-xs placeholder-slate-700"
                  />
                </div>

                {/* Standard Override scoring parameters parameters */}
                <div className="sm:col-span-2 bg-slate-950 border border-slate-850 p-4.5 rounded-xl space-y-4">
                  <label className="flex items-center gap-2.5 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideScoring}
                      onChange={(e) => setOverrideScoring(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-805 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Override Campaign Scoring Rules For This Event
                    </span>
                  </label>

                  {overrideScoring && (
                    <div className="grid grid-cols-2 gap-4 pt-2.5 border-t border-slate-850">
                      <div className="space-y-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <label className="block text-[9px] font-mono text-slate-400 transition uppercase font-bold">
                          Correct Point Override
                        </label>
                        <input
                          type="number"
                          value={correctPointsOverride}
                          onChange={(e) => setCorrectPointsOverride(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={campaign.config.scoringRules.correctPredictionPoints.toString()}
                          className="bg-transparent border-0 text-white font-mono text-xs focus:ring-0 p-0 block w-full mt-1 header-none"
                        />
                      </div>

                      <div className="space-y-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <label className="block text-[9px] font-mono text-slate-400 transition uppercase font-bold">
                          Participation point Override
                        </label>
                        <input
                          type="number"
                          value={participationPointsOverride}
                          onChange={(e) => setParticipationPointsOverride(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={campaign.config.scoringRules.participationPoints.toString()}
                          className="bg-transparent border-0 text-white font-mono text-xs focus:ring-0 p-0 block w-full mt-1 header-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-5.5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                >
                  Commit Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK SELECT ANSWER OUTCOME MODAL */}
      {recordingResultEvent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-850">
              <span className="text-sm font-bold text-white uppercase tracking-wider font-mono">Record Official Outcome</span>
              <button onClick={() => setRecordingResultEvent(null)} className="text-slate-400 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Choose the official result of the event <strong>"{recordingResultEvent.label}"</strong>. It will be propagated for real-time scoring rules calculating individual leaderboard weights.
                </p>
              </div>

              {/* Quick outcome selections according to event type */}
              {recordingResultEvent.type === 'match' ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Standard Matches Quick Presets</p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => setCustomResultInput(recordingResultEvent.metadata.teamA || 'Team A')}
                      className="p-3 bg-slate-950 border border-slate-805 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition text-center truncate"
                    >
                      {recordingResultEvent.metadata.teamA || 'Team A'} Wins
                    </button>
                    <button
                      onClick={() => setCustomResultInput(recordingResultEvent.metadata.teamB || 'Team B')}
                      className="p-3 bg-slate-950 border border-slate-805 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition text-center truncate"
                    >
                      {recordingResultEvent.metadata.teamB || 'Team B'} Wins
                    </button>
                    <button
                      onClick={() => setCustomResultInput('Draw')}
                      className="p-3 bg-slate-950 border border-slate-805 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition text-center"
                    >
                      Draw
                    </button>
                  </div>
                </div>
              ) : recordingResultEvent.metadata.choices && recordingResultEvent.metadata.choices.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-mono uppercase text-slate-500 font-bold">Multiple Choice Options</p>
                  <div className="grid grid-cols-2 gap-2">
                    {recordingResultEvent.metadata.choices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setCustomResultInput(choice)}
                        className="p-2.5 bg-slate-950 border border-slate-805 hover:bg-slate-850 rounded-xl text-xxs font-semibold text-slate-300 text-left truncate"
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Direct manual string input */}
              <div className="space-y-1.5 col">
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Manual Result String Override</label>
                <input
                  type="text"
                  value={customResultInput}
                  onChange={(e) => setCustomResultInput(e.target.value)}
                  placeholder="e.g. 2-1, Draw, Option A"
                  className="bg-slate-950 border border-slate-805 focus:border-emerald-500 font-mono text-xs block w-full px-3.5 py-2.5 rounded-xl text-white placeholder-slate-705"
                />
                <span className="text-[9px] text-slate-550 italic block">
                  Leave blank to reset back to UNRESOLVED status state.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4.5 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setRecordingResultEvent(null)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveResult}
                  className="px-4.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-lg transition"
                >
                  Write Answer Outcome
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}