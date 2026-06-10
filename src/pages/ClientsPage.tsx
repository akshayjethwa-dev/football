import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClients, deleteClient } from '../services/firebaseClientService';
import { Client, ClientType, ClientStatus } from '../types';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Edit, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  Building, 
  Wifi, 
  Filter, 
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  Heart,
  Briefcase,
  Layers,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const fetchAllClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedClients = await getClients();
      setClients(fetchedClients);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load clients. Verify security rules or database initialization.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClients();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete ${name}? All associated campaigns may be orphaned.`)) {
      return;
    }

    try {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error(err);
      alert(`Error deleting client: ${err.message || 'Operation forbidden'}`);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (client.senderNumber || '').includes(searchTerm);
    const matchesType = selectedType === 'all' || client.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || client.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getClientTypeIcon = (type: ClientType) => {
    switch (type) {
      case 'cafe': return ShoppingBag;
      case 'retailer': return ShoppingBag;
      case 'gym': return Heart;
      case 'B2B': return Briefcase;
      default: return Layers;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            B2B Tenants (Clients)
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            Manage your retail partners, cafes, and SME integrations administering the WhatsApp predictive engine.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchAllClients}
            disabled={loading}
            className="p-3 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh Clients List"
          >
            <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => navigate('/admin/clients/new')}
            className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition transform active:scale-98 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5px]" />
            <span>Provision Client</span>
          </button>
        </div>
      </div>

      {/* Statistics Quick-Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Total Clients</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">{clients.length}</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Active Accounts</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {clients.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
          <p className="text-xxs font-mono text-slate-500 uppercase tracking-widest">Global Type Mix</p>
          <div className="flex gap-2.5 mt-2 flex-wrap">
            {['cafe', 'retailer', 'gym', 'B2B'].map(t => (
              <span key={t} className="text-[10px] bg-slate-850 px-2 py-0.5 rounded text-slate-400 font-mono capitalize">
                {t}: {clients.filter(c => c.type === t).length}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800/80 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search by client name, contact person or sending number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white block w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition placeholder-slate-600"
          />
        </div>

        {/* select filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl w-full sm:w-auto">
            <Filter className="h-4 w-4 text-emerald-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none w-full sm:w-32 cursor-pointer font-sans"
            >
              <option value="all">All Types</option>
              <option value="cafe">Cafe</option>
              <option value="retailer">Retailer</option>
              <option value="gym">Gym</option>
              <option value="B2B">B2B SaaS</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl w-full sm:w-auto">
            <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-0 text-slate-300 text-xs focus:ring-0 focus:outline-none w-full sm:w-32 cursor-pointer font-sans"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main clients list representation */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-900/40 border border-slate-850 h-52 rounded-2xl animate-pulse flex flex-col p-6 space-y-4 justify-between">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-800 w-32 rounded-lg" />
                  <div className="h-3 bg-slate-800 w-20 rounded" />
                </div>
                <div className="h-10 w-10 bg-slate-800 rounded-xl" />
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-3 bg-slate-800 w-full rounded" />
                <div className="h-3 bg-slate-800 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-rose-500/20 text-center p-12 rounded-2xl space-y-4 max-w-xl mx-auto">
          <p className="text-rose-400 font-semibold text-lg">Failed to Retrieve Client Snapshots</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            The Firestore database read operation was rejected. Ensure your Firebase configuration matches database rules and email/password authentication is fully established.
          </p>
          <div className="pt-2">
            <button
              onClick={fetchAllClients}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg text-xs font-semibold font-mono inline-flex items-center gap-2 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Connection
            </button>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-850/80 rounded-2xl p-16 text-center max-w-2xl mx-auto space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-500">
            <Building className="h-6 w-6" />
          </div>
          <p className="text-white font-bold text-lg">No B2B Tenants Found</p>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'No tenants match your search filter fields. Refine your filters or clear the search criteria.'
              : 'Add your first enterprise partner to set up event prediction parameters and send campaigns.'}
          </p>
          {!searchTerm && selectedType === 'all' && selectedStatus === 'all' && (
            <div className="pt-2">
              <button
                onClick={() => navigate('/admin/clients/new')}
                className="px-5 py-2.5 bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 text-xs cursor-pointer rounded-xl transition"
              >
                Provision First Client
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const IconComponent = getClientTypeIcon(client.type);
            return (
              <div 
                key={client.id}
                className="group relative bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/25 rounded-2xl p-6 transition flex flex-col justify-between h-full hover:shadow-xl hover:shadow-emerald-500/[0.02]"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-12 h-px w-24 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
                
                <div className="space-y-4">
                  {/* Title Bar layout */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white group-hover:text-emerald-400 transition truncate block">
                          {client.name}
                        </span>
                        {client.status === 'active' ? (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-400" title="Active" />
                        ) : (
                          <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-slate-600" title="Inactive" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-500 bg-slate-950/80 px-2 py-0.5 rounded">
                          {client.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 truncate">
                          ID: {client.id}
                        </span>
                      </div>
                    </div>

                    <div className="h-10 w-10 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 shrink-0 select-none overflow-hidden transition">
                      {client.logoUrl ? (
                        <img 
                          src={client.logoUrl} 
                          alt={client.name} 
                          className="object-cover h-full w-full"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <IconComponent className="h-5 w-5 stroke-[1.8px]" />
                      )}
                    </div>
                  </div>

                  {/* Details Card info */}
                  <div className="pt-2.5 space-y-2 border-t border-slate-850">
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <User className="h-3.5 w-3.5 text-slate-600" />
                      <span className="truncate">{client.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Mail className="h-3.5 w-3.5 text-slate-600" />
                      <span className="truncate font-mono">{client.contactEmail}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <Phone className="h-3.5 w-3.5 text-slate-600" />
                      <span className="font-mono">{client.contactPhone}</span>
                    </div>
                  </div>

                  {/* Sender Integration */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-xxs font-mono text-slate-500 flex justify-between items-center">
                    <span>WHATSAPP SENDER</span>
                    <span className="text-slate-300 font-semibold">{client.senderNumber || 'Not Configured'}</span>
                  </div>
                </div>

                {/* Card footer CTA buttons */}
                <div className="flex items-center justify-between border-t border-slate-850/80 mt-5 pt-4">
                  <button
                    onClick={() => navigate(`/admin/clients/${client.id}/campaigns`)}
                    className="px-3.5 py-1.5 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xxs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Manage Campaigns"
                  >
                    <span>Campaigns</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/clients/edit/${client.id}`)}
                      className="p-2 border border-slate-800 hover:border-slate-750 bg-slate-950/50 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                      title="Edit Tenant Configuration"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id, client.name)}
                      className="p-2 border border-slate-800 hover:border-rose-950/30 bg-slate-950/50 hover:bg-rose-950/20 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Delete Tenant"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
