import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClientById } from '../services/firebaseClientService';
import { getCampaigns, deleteCampaign, updateCampaign } from '../services/firebaseCampaignService';
import { Client, Campaign, CampaignStatus, CampaignEventType, CampaignGameType } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Trophy, 
  Layers, 
  CheckCircle, 
  Archive, 
  FileText, 
  Trash2, 
  Edit, 
  RefreshCw, 
  ChevronRight,
  Info,
  Clock,
  Sparkles,
  PhoneCall,
  LayoutGrid
} from 'lucide-react';

export default function ClientCampaignsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const clientDoc = await getClientById(clientId);
      if (!clientDoc) {
        setError(`Tenant/Client with ID "${clientId}" was not found.`);
        setLoading(false);
        return;
      }
      setClient(clientDoc);
      const campaignDocs = await getCampaigns(clientId);
      setCampaigns(campaignDocs);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load client profile or associated campaigns dossier.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const handleStatusToggle = async (campaignId: string, currentStatus: CampaignStatus, nextStatus: CampaignStatus) => {
    if (!clientId) return;
    try {
      await updateCampaign(clientId, campaignId, { status: nextStatus });
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: nextStatus } : c));
    } catch (err: any) {
      console.error(err);
      alert(`Could not alter status: ${err.message || 'Forbidden'}`);
    }
  };

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!clientId) return;
    if (!window.confirm(`Are you absolutely sure you want to delete "${campaignName}" campaign? All metrics, submissions & parameters will be removed.`)) {
      return;
    }

    try {
      await deleteCampaign(clientId, campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err: any) {
      console.error(err);
      alert(`Could not delete campaign: ${err.message || 'Forbidden'}`);
    }
  };

  const filteredCampaigns = campaigns.filter(camp => {
    const matchesSearch = camp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          camp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || camp.status === statusFilter;
    const matchesGame = gameFilter === 'all' || camp.gameType === gameFilter;
    return matchesSearch && matchesStatus && matchesGame;
  });

  const getStatusStyle = (status: CampaignStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'archived':
        return 'bg-slate-800 text-slate-400 border-slate-750';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  const getEventTypeLabel = (type: CampaignEventType) => {
    switch (type) {
      case 'football_world_cup': return '⚽ Football';
      case 'cricket': return '🏏 Cricket Tournament';
      case 'festival': return '🎉 Festive Holiday';
      default: return '⚙️ Custom Event';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 space-y-3">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-400 font-mono text-xs">PULLING ASSOCIATED CAMPAIGNS DOSSIER...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
        <p className="text-rose-400 font-semibold text-lg">Error Resolving Dossier</p>
        <p className="text-slate-400 text-xs">{error || 'Tenant info missing.'}</p>
        <button
          onClick={() => navigate('/admin/clients')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Return & Action bar split */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/admin/clients')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-2 group transition"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            <span>Return to B2B Tenants</span>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {client.name} Dashboard
            </h1>
            <span className="text-mini uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-semibold">
              Client Admin Scope
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Configure custom campaigns, predict outcomes and examine WhatsApp automation rulesets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="p-3 border border-slate-850 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          
          <button
            onClick={() => navigate(`/admin/clients/${clientId}/campaigns/new`)}
            className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition transform active:scale-98"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            <span>New Campaign Instance</span>
          </button>
        </div>
      </div>

      {/* Tenant Informative details Box */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 sm:p-6 grid grid-cols-1 md:grid-cols-4 gap-6 relative overflow-hidden">
        <div className="absolute -top-1.25 right-20 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
        
        <div className="space-y-1 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-850 pb-4 md:pb-0 md:pr-6 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-wider">Tenant Profile</p>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="h-10 w-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold overflow-hidden">
              {client.logoUrl ? (
                <img src={client.logoUrl} alt={client.name} className="object-cover h-full w-full" />
              ) : (
                client.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{client.name}</p>
              <p className="text-mini text-slate-500 font-mono capitalize">Type: {client.type}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-850 pb-4 md:pb-0 md:pr-6 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-wider">Primary Contact</p>
          <p className="text-xs text-slate-300 font-semibold mt-1.5">{client.contactPerson}</p>
          <p className="text-mini text-slate-500 font-mono truncate">{client.contactEmail}</p>
          <p className="text-mini text-slate-500 font-mono">{client.contactPhone}</p>
        </div>

        <div className="space-y-1 md:col-span-1 border-b md:border-b-0 md:border-r border-slate-850 pb-4 md:pb-0 md:pr-6 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-wider">WhatsApp Integration</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-slate-300 font-mono font-bold">
              {client.senderNumber || 'Config pending'}
            </p>
          </div>
          <span className="text-[10px] text-slate-500 leading-tight">
            Callback responses bind dynamically to client container parameters.
          </span>
        </div>

        <div className="space-y-1 md:col-span-1 flex flex-col justify-center">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-wider">Campaign Capacity</p>
          <p className="text-lg font-bold font-mono text-white mt-1.5">
            {campaigns.length} <span className="text-xs text-slate-500 font-sans font-normal">Created Tasks</span>
          </p>
          <span className="text-[10px] text-emerald-400/80 font-semibold mt-0.5 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> {campaigns.filter(c => c.status === 'active').length} Instantiated-Active
          </span>
        </div>
      </div>

      {/* Campaigns list Header & Filters */}
      <div className="space-y-4">
        <div className="bg-slate-900/40 border border-slate-850 p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search campaigns by moniker, description keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full pl-9 pr-4 py-2 rounded-xl text-xs placeholder-slate-650"
            />
          </div>

          {/* Filters selection */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl w-full sm:w-auto">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft State Only</option>
                <option value="active">Active Running</option>
                <option value="archived">Archived Historical</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl w-full sm:w-auto">
              <LayoutGrid className="h-3.5 w-3.5 text-emerald-400" />
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none cursor-pointer w-full"
              >
                <option value="all">All Game Types</option>
                <option value="prediction">Score Prediction</option>
                <option value="quiz">Trivia Quiz</option>
                <option value="referral">Member Referral</option>
                <option value="mixed">Mixed Campaigns</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Campaigns Cards representation */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-850 p-12 text-center rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-850 mx-auto flex items-center justify-center text-slate-500">
              <Trophy className="h-6 w-6" />
            </div>
            <p className="text-white font-bold text-md">No Campaigns Instantiated</p>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              {searchTerm || statusFilter !== 'all' || gameFilter !== 'all'
                ? 'No campaigns found matching selected search term or property filters.'
                : 'Configure score prediction prompts, tournament brackets and WhatsApp responders under this client.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((camp) => (
              <div 
                key={camp.id}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/20 rounded-2xl p-5 sm:p-6 transition flex flex-col justify-between space-y-5"
              >
                {/* Upper line: identity & status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-mono uppercase font-semibold border ${getStatusStyle(camp.status)}`}>
                        {camp.status.toUpperCase()}
                      </span>
                      <h3 className="text-lg font-bold text-white tracking-tight mt-2 truncate">
                        {camp.name}
                      </h3>
                      <p className="text-mini font-mono text-slate-500 truncate mt-0.5">
                        ID: {camp.id}
                      </p>
                    </div>

                    <div className="flex gap-1">
                      {camp.status !== 'active' && (
                        <button
                          onClick={() => handleStatusToggle(camp.id, camp.status, 'active')}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xxs font-semibold flex items-center gap-1 transition"
                          title="Deploy Active"
                        >
                          Launch
                        </button>
                      )}
                      {camp.status !== 'archived' && (
                        <button
                          onClick={() => handleStatusToggle(camp.id, camp.status, 'archived')}
                          className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800 rounded-lg text-xxs font-semibold flex items-center gap-1 transition"
                          title="Archive Instance"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-350 line-clamp-3 leading-relaxed">
                    {camp.description || 'No descriptive description documented.'}
                  </p>
                </div>

                {/* Characteristics block */}
                <div className="grid grid-cols-2 gap-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-850/80">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Campaign Type</span>
                    <span className="text-xxs font-semibold text-slate-300">
                      {getEventTypeLabel(camp.eventType)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Game Mechanic</span>
                    <span className="text-xxs font-semibold text-slate-300 capitalize">
                      ⭐ {camp.gameType} Mode
                    </span>
                  </div>
                  <div className="space-y-1 pt-1.5 border-t border-slate-850 col-span-2 flex justify-between items-center text-xxs">
                    <span className="text-slate-500 font-mono">CHANNELS:</span>
                    <span className="text-emerald-400 font-semibold font-mono tracking-wider">
                      {camp.config.channelsEnabled.join(' • ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* scoring guidelines brief */}
                <div className="space-y-1.5 text-xxs">
                  <span className="font-mono text-slate-500">SCORING RULES BRIEF:</span>
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-850 font-mono text-slate-400">
                      Correct Result: +{camp.config.scoringRules.correctPredictionPoints} pts
                    </span>
                    <span className="bg-slate-950 px-2 py-1 rounded border border-slate-850 font-mono text-slate-400">
                      Participation: +{camp.config.scoringRules.participationPoints} pts
                    </span>
                  </div>
                </div>

                {/* Temporal brackets & Actions footer */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-4 border-t border-slate-850/80 mt-2 text-xxs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    <span className="font-mono">
                      {camp.startDate ? camp.startDate.substring(0, 10) : 'TBD'} — {camp.endDate ? camp.endDate.substring(0, 10) : 'TBD'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end">
                    <button
                      onClick={() => navigate(`/admin/clients/${clientId}/campaigns/${camp.id}`)}
                      className="px-3 py-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xxs font-bold flex items-center gap-1.5 transition uppercase cursor-pointer"
                      title="Define Events & Questions"
                    >
                      <span>Setup Events</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => navigate(`/admin/clients/${clientId}/campaigns/edit/${camp.id}`)}
                      className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition"
                      title="Edit Campaign Properties"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                      className="p-2 bg-slate-950 border border-slate-800 hover:border-rose-900/40 hover:bg-rose-950/10 rounded-lg text-slate-400 hover:text-rose-400 transition"
                      title="Delete Campaign Instance"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
