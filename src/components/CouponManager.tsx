import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Tag, UserPlus, RefreshCw, Send, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { getCoupons, generateCoupons, assignCoupon, updateCouponStatus } from '../services/firebaseCouponService';
import { useCampaignParticipants } from '../hooks/useParticipants';
import { useSendCouponMessage } from '../hooks/useWhatsApp';
import { Coupon, CouponStatus, Participant } from '../types';

interface CouponManagerProps {
  clientId: string;
  campaignId: string;
}

export default function CouponManager({ clientId, campaignId }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all');
  
  // Bulk Generation Form State
  const [generateCount, setGenerateCount] = useState(5);
  const [rewardDesc, setRewardDesc] = useState('Free Double Espresso Upgrade');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validTo, setValidTo] = useState(new Date(Date.now() + 30 * 86400 * 1000).toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Assigning State
  const [assigningCouponId, setAssigningCouponId] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch participants & coupon list
  const { data: participants = [] } = useCampaignParticipants(clientId, campaignId);
  const sendCouponMsg = useSendCouponMessage();

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await getCoupons(clientId, campaignId);
      setCoupons(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to query coupons database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [clientId, campaignId]);

  // Set timeout for message states
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Handle Bulk Creation
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generateCount < 1 || generateCount > 50) {
      setErrorMsg('Please specify a counter value between 1 and 50.');
      return;
    }
    if (!rewardDesc.trim()) {
      setErrorMsg('A reward description / product perk is required.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateCoupons(
        clientId,
        campaignId,
        generateCount,
        rewardDesc,
        validFrom,
        validTo
      );
      setSuccessMsg(`Successfully generated ${res.length} random coupon codes!`);
      // Reload lists
      await loadCoupons();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Generation failed: ${err.message || 'Check firebase-blueprint configuration'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Assign Coupon
  const handleAssign = async () => {
    if (!assigningCouponId || !selectedParticipantId) return;

    try {
      await assignCoupon(clientId, campaignId, assigningCouponId, selectedParticipantId);
      
      // Update local state instantly
      setCoupons(prev => prev.map(c => c.id === assigningCouponId ? { ...c, participantId: selectedParticipantId } : c));
      
      const participant = participants.find(p => p.id === selectedParticipantId);
      setSuccessMsg(`Successfully assigned coupon code to ${participant?.name || 'nominee'}!`);
      setAssigningCouponId(null);
      setSelectedParticipantId('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed assigning reward code.');
    }
  };

  // Change status
  const handleUpdateStatus = async (couponId: string, status: CouponStatus) => {
    try {
      await updateCouponStatus(clientId, campaignId, couponId, status);
      setCoupons(prev => prev.map(c => c.id === couponId ? { ...c, status } : c));
      setSuccessMsg(`Coupon status updated to "${status}"`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed updating state.');
    }
  };

  // Trigger WhatsApp Coupon
  const handleSendWhatsAppNotification = async (coupon: Coupon) => {
    if (!coupon.participantId) return;

    const participant = participants.find(p => p.id === coupon.participantId);
    if (!participant) {
      setErrorMsg('Participant details are not resolved.');
      return;
    }

    try {
      await sendCouponMsg.mutateAsync({
        recipientPhone: participant.phone,
        name: participant.name,
        couponCode: coupon.code,
        giftDescription: coupon.metadata?.description || 'Exclusive Campaign Reward',
        campaignId,
      });

      setSuccessMsg(`WhatsApp congratulations notification queued for ${participant.name}!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`WhatsApp trigger failed: ${err.message || 'Check API gateway setups'}`);
    }
  };

  // Filter coupons list
  const filteredCoupons = coupons.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'unused') return c.status === 'unused' && c.participantId === null;
    if (filter === 'used') return c.status === 'used';
    if (filter === 'expired') return c.status === 'expired';
    return true;
  });

  return (
    <div className="space-y-8" id="reward-coupons-panel">
      {/* Messages */}
      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-red-450 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Management Controls & Coupon Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Generator Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/30 border border-slate-850 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Generate Reward Codes
            </h4>
            <p className="text-xxs text-slate-400 leading-relaxed">
              Create randomized unique coupons for the campaign. Winners can redeem their prize code at point-of-sale systems.
            </p>

            <form onSubmit={handleBulkGenerate} className="space-y-4.5 pt-2">
              <div className="space-y-1.5Col">
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Number of Codes</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-805 text-white block w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5Col">
                <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Reward Perk Description</label>
                <input
                  type="text"
                  placeholder="e.g. Free Espresso, 20% off meals"
                  value={rewardDesc}
                  onChange={(e) => setRewardDesc(e.target.value)}
                  className="bg-slate-950 border border-slate-805 text-white block w-full px-3.5 py-2.5 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5Col">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Valid From</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="bg-slate-950 border border-slate-805 text-white block w-full px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5Col">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-bold">Valid To</label>
                  <input
                    type="date"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    className="bg-slate-950 border border-slate-805 text-white block w-full px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-45 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                <span>{isGenerating ? 'Engaging Matrices...' : 'Generate Codes'}</span>
              </button>
            </form>
          </div>

          {/* Quick Stats overview */}
          <div className="bg-slate-900/10 border border-slate-850/60 p-4.5 rounded-xl grid grid-cols-3 gap-2 text-center select-none">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Total Rewards</span>
              <span className="text-sm font-black text-white font-mono mt-0.5 block">{coupons.length}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Distributed</span>
              <span className="text-sm font-black text-amber-500 font-mono mt-0.5 block">{coupons.filter(c => c.participantId !== null).length}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold block">Claimed Used</span>
              <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">{coupons.filter(c => c.status === 'used').length}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Active Coupons Board and Filters */}
        <div className="lg:col-span-8 space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-850 p-4 rounded-xl">
            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'unused', 'used', 'expired'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-mono uppercase font-bold tracking-wider transition ${
                    filter === opt
                      ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                      : 'bg-transparent border border-transparent text-slate-450 hover:text-white'
                  }`}
                >
                  {opt === 'unused' ? 'Unassigned' : opt}
                </button>
              ))}
            </div>

            <button
              onClick={loadCoupons}
              disabled={isLoading}
              className="font-mono text-[10px] text-slate-400 hover:text-white flex items-center gap-1.5 transition self-end sm:self-auto"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Board</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xxs text-slate-500 font-mono">Quarrying coupon records...</p>
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-850/60 p-12 rounded-xl text-center text-xs text-slate-500 font-mono">
              No coupons discovered matching filter selection.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCoupons.map((coupon) => {
                const isAssigned = coupon.participantId !== null;
                const assignedUser = isAssigned ? participants.find(p => p.id === coupon.participantId) : null;

                return (
                  <div 
                    key={coupon.id} 
                    className="bg-slate-900/30 border border-slate-850 py-4.5 px-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-800 transition"
                  >
                    {/* Coupon Badge & details */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1 bg-slate-950 border border-slate-800 font-mono text-xs font-black text-white rounded-lg tracking-wider">
                          {coupon.code}
                        </span>
                        
                        <span className={`px-2 py-0.5 border text-[9px] font-mono uppercase font-black rounded ${
                          coupon.status === 'used'
                            ? 'bg-teal-500/10 border-teal-505/20 text-teal-400'
                            : coupon.status === 'expired'
                            ? 'bg-rose-550/10 border-rose-550/15 text-rose-500'
                            : 'bg-emerald-500/10 border-emerald-505/20 text-emerald-400'
                        }`}>
                          {coupon.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-200">
                        🎁 {coupon.metadata?.description || 'Campaign Incentive'}
                      </div>

                      {/* Expiration and Validities */}
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-600" />
                        <span>Valid: {coupon.metadata?.validFrom} to {coupon.metadata?.validTo}</span>
                      </div>
                    </div>

                    {/* Participant allocation and Actions drawer */}
                    <div className="border-t md:border-t-0 border-slate-850 pt-3.5 md:pt-0 flex flex-col sm:flex-row sm:items-center gap-3">
                      {isAssigned ? (
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 flex flex-col gap-1 sm:max-w-xs">
                          <span className="text-[9px] font-mono text-slate-550 uppercase font-black">Winner Assigned:</span>
                          <span className="text-xs font-extrabold text-slate-350 truncate">{assignedUser?.name}</span>
                          <span className="text-xxs text-slate-500 font-mono">{assignedUser?.phone}</span>
                          
                          {/* Send notification WhatsApp trigger */}
                          <button
                            onClick={() => handleSendWhatsAppNotification(coupon)}
                            disabled={sendCouponMsg.isPending}
                            className="mt-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition rounded-lg text-xxs font-bold text-slate-400 flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="h-3 w-3 text-emerald-400" />
                            <span>Notify Claim via WhatsApp</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {assigningCouponId === coupon.id ? (
                            <div className="flex gap-2 items-center flex-wrap">
                              <select
                                value={selectedParticipantId}
                                onChange={(e) => setSelectedParticipantId(e.target.value)}
                                className="bg-slate-950 border border-slate-805 text-white px-2.5 py-1.5 rounded-lg text-xs"
                              >
                                <option value="">-- Choose Winners nominee --</option>
                                {participants
                                  .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.totalPoints || 0} pts) - {p.phone.slice(-4)}
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={handleAssign}
                                disabled={!selectedParticipantId}
                                className="px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xxs font-bold rounded-lg transition"
                              >
                                Assign
                              </button>
                              <button
                                onClick={() => setAssigningCouponId(null)}
                                className="text-xxs text-slate-400 underline hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssigningCouponId(coupon.id)}
                              className="px-3 py-1.5 border border-slate-800 hover:bg-slate-850 rounded-lg text-xxs font-bold text-slate-350 hover:text-white flex items-center gap-1.5 transition"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Assign to Winner</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Admin status adjustments */}
                      {coupon.status === 'unused' && (
                        <button
                          onClick={() => handleUpdateStatus(coupon.id, 'used')}
                          className="px-2 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg text-xxs font-bold transition text-center"
                        >
                          Mark Redeemed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
