import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createClient, updateClient, getClientById } from '../services/firebaseClientService';
import { Client, ClientType, ClientStatus } from '../types';
import { ArrowLeft, Save, Building, ShieldCheck, Sparkles } from 'lucide-react';

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<ClientType>('cafe');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [status, setStatus] = useState<ClientStatus>('active');

  useEffect(() => {
    if (isEditMode && id) {
      const loadClient = async () => {
        try {
          const client = await getClientById(id);
          if (client) {
            setClientId(client.id);
            setName(client.name);
            setType(client.type);
            setContactPerson(client.contactPerson);
            setContactEmail(client.contactEmail);
            setContactPhone(client.contactPhone);
            setLogoUrl(client.logoUrl || '');
            setSenderNumber(client.senderNumber || '');
            setStatus(client.status);
          } else {
            setError(`Client with ID "${id}" was not found.`);
          }
        } catch (err: any) {
          console.error(err);
          setError("Failed to fetch client details. Ensure your security rules and database setup are configured.");
        } finally {
          setFetching(false);
        }
      };
      loadClient();
    }
  }, [isEditMode, id]);

  const handleDemoAutofill = () => {
    const randomHex = Math.floor(Math.random() * 1000);
    setClientId(`cafe-arena-${randomHex}`);
    setName('Arena Sports Cafe');
    setType('cafe');
    setContactPerson('Rajesh Patel');
    setContactEmail('rajesh@arenacafe.in');
    setContactPhone('+919876543210');
    setLogoUrl('https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=150');
    setSenderNumber('+919999988888');
    setStatus('active');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!clientId.trim()) {
      setError("Client Unique Identifier is required.");
      return;
    }

    const regIdPattern = /^[a-zA-Z0-9_\-]+$/;
    if (!regIdPattern.test(clientId)) {
      setError("Client ID must only contain alphanumeric characters, hyphens (-) or underscores (_). No spaces allowed.");
      return;
    }

    if (!name.trim()) {
      setError("Client Name is required.");
      return;
    }

    setLoading(true);
    const clientPayload = {
      id: clientId.trim(),
      name: name.trim(),
      type,
      contactPerson: contactPerson.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      logoUrl: logoUrl.trim() || undefined,
      senderNumber: senderNumber.trim() || undefined,
      status,
    };

    try {
      if (isEditMode) {
        // Exclude ID and fields from changes
        await updateClient(clientId, {
          name: clientPayload.name,
          type: clientPayload.type,
          contactPerson: clientPayload.contactPerson,
          contactEmail: clientPayload.contactEmail,
          contactPhone: clientPayload.contactPhone,
          logoUrl: clientPayload.logoUrl,
          senderNumber: clientPayload.senderNumber,
          status: clientPayload.status,
        });
      } else {
        await createClient(clientPayload);
      }
      navigate('/admin/clients');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred writing raw client record to Firestore database.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <svg className="animate-spin h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-400 font-mono text-xs">PULLING B2B TENANT DOSSIER...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Form Back and Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/admin/clients')}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-2 group transition"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition" />
            <span>Return to directory</span>
          </button>
          
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {isEditMode ? 'Modify Tenant Settings' : 'Provision Enterprise Tenant'}
          </h1>
          <p className="text-sm text-slate-400">
            {isEditMode 
              ? `Aesthetic configurations and WhatsApp configurations for client ID: ${id}`
              : 'Add partner cafe, retailer, gym or office locations to configure campaign flows.'}
          </p>
        </div>

        {!isEditMode && (
          <button
            type="button"
            onClick={handleDemoAutofill}
            className="flex items-center gap-2 self-start py-2.5 px-4 border border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Mock Client Profile</span>
          </button>
        )}
      </div>

      {/* Main interactive form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm leading-relaxed">
              <p className="font-semibold mb-1">Configuration Warning</p>
              <p>{error}</p>
            </div>
          )}

          {/* Form blocks split in grid */}
          <div className="space-y-6">
            
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-850 pb-2">
              Identity & Classification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Client ID (Read-only after generation)
                </label>
                <input
                  type="text"
                  disabled={isEditMode}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="e.g. cafe-unplugged"
                  required
                  className="bg-slate-950 border border-slate-800 disabled:opacity-50 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
                <span className="text-mini font-mono text-slate-600 block mt-1">
                  Database path ID used as the multi-tenant key. No spaces allowed.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Business Client Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cafe Unplugged"
                  required
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Industry Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ClientType)}
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm cursor-pointer"
                >
                  <option value="cafe">Cafe / Diner</option>
                  <option value="retailer">Retailer / Merchant</option>
                  <option value="gym">Gym / Health Club</option>
                  <option value="B2B">B2B SaaS / Corporate</option>
                  <option value="other">Other SME</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Deployment Status
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus('active')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('inactive')}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      status === 'inactive' 
                        ? 'bg-slate-800 text-slate-300 border-slate-700' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

            </div>

          </div>

          <div className="space-y-6">
            
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-850 pb-2">
              Contact & Lead Person info
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Full Name / Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Sunita Shah"
                  required
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. sunita@client.com"
                  required
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +91 99999 88888"
                  required
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
              </div>

            </div>

          </div>

          <div className="space-y-6">
            
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-850 pb-2">
              Integrations & Branding Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Sender Base Number / API Sender (WhatsApp)
                </label>
                <input
                  type="text"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="e.g. Gupshup Sender ID / Phone No."
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
                <span className="text-mini font-mono text-slate-600 block mt-1">
                  Abstracted provider identifier used in the system's WhatsAppService callback configurations.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Client Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.jpg"
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl focus:ring-1 focus:ring-emerald-500 block w-full p-3 text-sm placeholder-slate-700"
                />
              </div>

            </div>

          </div>

          {/* Form Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-850/80">
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
              className="w-full sm:w-auto px-6 py-3 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-8 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving record...</span>
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  <span>{isEditMode ? 'Apply Updates' : 'Provision Client'}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
