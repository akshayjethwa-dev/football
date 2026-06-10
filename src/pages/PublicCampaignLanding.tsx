import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useCampaignAndClient, 
  useCampaignEvents, 
  useParticipantResponses, 
  useRegisterParticipantMutation, 
  useSubmitResponseMutation,
  useParticipantDetails
} from '../hooks/useParticipants';
import { useSendWelcomeMessage } from '../hooks/useWhatsApp';
import { getParticipantById } from '../services/firebaseParticipantService';
import { 
  Trophy, 
  Mail, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Check, 
  AlertCircle, 
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Gift, 
  Ticket
} from 'lucide-react';
import { CampaignEvent } from '../types';

export default function PublicCampaignLanding() {
  const { campaignId } = useParams<{ campaignId: string }>();

  // Fetch campaign structure and branding
  const { 
    data: context, 
    isLoading: isContextLoading, 
    isError: isContextError,
    error: contextError 
  } = useCampaignAndClient(campaignId);

  const campaign = context?.campaign;
  const client = context?.client;

  // Track client-side participant session
  const [participantId, setParticipantId] = useState<string | null>(() => {
    if (!campaignId) return null;
    return localStorage.getItem(`predictive_participant_${campaignId}`);
  });

  const { data: participant, isLoading: isParticipantLoading } = useParticipantDetails(
    client?.id,
    campaign?.id,
    participantId || undefined
  );

  const { data: events = [], isLoading: isEventsLoading } = useCampaignEvents(client?.id, campaign?.id);
  const { data: responses = [], isLoading: isResponsesLoading } = useParticipantResponses(
    client?.id,
    campaign?.id,
    participantId || undefined
  );

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Selected event to predict
  const [selectedEvent, setSelectedEvent] = useState<CampaignEvent | null>(null);
  const [predictionAnswer, setPredictionAnswer] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const registerMutation = useRegisterParticipantMutation(client?.id, campaign?.id);
  const submitResponseMutation = useSubmitResponseMutation(client?.id, campaign?.id, participantId || undefined);
  const sendWelcome = useSendWelcomeMessage();

  // Sync details from loaded participant to localStorage validity
  useEffect(() => {
    if (participantId && !isParticipantLoading && !participant) {
      // Participant was probably deleted or does not exist in active database
      localStorage.removeItem(`predictive_participant_${campaignId}`);
      setParticipantId(null);
    }
  }, [participant, isParticipantLoading, participantId, campaignId]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter your phone number.');
      return;
    }

    // Normalize phone number to prevent duplicates (e.g., +919876543210 vs 9876543210)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length > 10) {
      cleanPhone = cleanPhone.slice(-10); // Capture the core 10 digits
    }
    
    if (cleanPhone.length < 7) {
      setFormError('Please enter a valid phone number.');
      return;
    }

    // Deterministic ID based on normalized phone number
    const generatedId = `part_${cleanPhone}`;

    try {
      // 1. Check if the participant already exists with this phone number
      const existingParticipant = await getParticipantById(client!.id, campaign!.id, generatedId);
      
      if (existingParticipant) {
        // Participant exists! Restore their session to show previous answers and block double-voting
        localStorage.setItem(`predictive_participant_${campaignId}`, generatedId);
        setParticipantId(generatedId);
        return;
      }

      // 2. If new, register them
      await registerMutation.mutateAsync({
        id: generatedId,
        campaignId: campaign!.id,
        clientId: client!.id,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        source: 'landing_page',
        whatsappOptIn,
      });

      // Dispatch welcome message if active WhatsApp consent is provided
      if (whatsappOptIn) {
        sendWelcome.mutate({
          recipientPhone: phone.trim(),
          name: name.trim(),
          campaignName: campaign!.name,
          campaignId: campaign!.id,
        });
      }

      localStorage.setItem(`predictive_participant_${campaignId}`, generatedId);
      setParticipantId(generatedId);
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please attempt again.');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out? Your guesses remain saved, but you will need to sign in/re-verify to edit.')) {
      localStorage.removeItem(`predictive_participant_${campaignId}`);
      setParticipantId(null);
      setName('');
      setPhone('');
      setEmail('');
    }
  };

  const handleSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedEvent || !predictionAnswer) {
      setSubmitError('Please select or write your prediction.');
      return;
    }

    const responseId = `resp_${selectedEvent.id}_${participantId}`;

    try {
      await submitResponseMutation.mutateAsync({
        id: responseId,
        participantId: participantId!,
        campaignId: campaign!.id,
        eventId: selectedEvent.id,
        answer: predictionAnswer,
      });

      setSelectedEvent(null);
      setPredictionAnswer('');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit prediction. Try again.');
    }
  };

  // Check if loading core content
  if (isContextLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center space-y-3">
          <svg className="animate-spin h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-neutral-500 font-sans text-sm font-medium tracking-wide">Loading campaign...</span>
        </div>
      </div>
    );
  }

  if (isContextError || !campaign || !client) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 flex flex-col items-center space-y-4">
          <div className="bg-rose-100 p-4 rounded-full text-rose-600">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold font-sans text-neutral-900">Campaign Not Available</h1>
          <p className="text-neutral-500 text-sm leading-relaxed">
            {contextError?.message || 'The specified campaign could not be resolved, is in draft state, or belongs to an inactive tenant.'}
          </p>
          <div className="w-full pt-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-neutral-900 text-white rounded-2xl font-semibold text-sm hover:bg-neutral-850 transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Identify submitted event ids
  const answeredEventIds = new Set(responses.map(r => r.eventId));

  // Categorize events
  const nowStr = new Date().toISOString();
  const activeEvents = events.filter(e => e.endTime > nowStr && !answeredEventIds.has(e.id));
  const pendingEvents = events.filter(e => answeredEventIds.has(e.id));
  const closedEvents = events.filter(e => e.endTime <= nowStr && !answeredEventIds.has(e.id));

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-emerald-150 py-6 px-4">
      <div className="max-w-md mx-auto flex flex-col min-h-[calc(100vh-3rem)]">
        
        {/* Header / Brand Branding */}
        <header id="header" className="flex flex-col items-center text-center space-y-3 pt-4 pb-6">
          {client.logoUrl ? (
            <img 
              referrerPolicy="no-referrer" 
              src={client.logoUrl} 
              alt={client.name} 
              className="h-16 w-auto object-contain rounded-2xl max-h-16 bg-white p-1 shadow-sm border border-neutral-150" 
            />
          ) : (
            <div className="h-14 w-14 bg-neutral-900 text-white flex items-center justify-center font-bold text-xl rounded-2xl shadow-sm">
              {client.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#a3a3a3]">
              Campaign Arena
            </span>
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight">
              {campaign.name}
            </h1>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              {campaign.description}
            </p>
          </div>
        </header>

        {/* Core Main Container */}
        <main id="main-content" className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!participantId || !participant ? (
              
              /* STAGE 1: REGISTRATION & CAPTURE */
              <motion.div
                key="register-stage"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-100 space-y-6"
              >
                <div className="text-center space-y-1">
                  <div className="inline-flex p-2 bg-emerald-50 rounded-xl text-emerald-600 mb-1">
                    <Trophy className="h-6 w-6 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-900">Join the Prediction Challenge</h2>
                  <p className="text-xs text-[#737373]">Register to start submitting predictions and win points!</p>
                </div>

                {/* DYNAMIC Rewards Description Banner */}
                {campaign.rewardsDescription && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                    <Gift className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">What's in it for you?</h4>
                      <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5 whitespace-pre-wrap">
                        {campaign.rewardsDescription}
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  {formError && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl text-xs flex items-start space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                      Name / Nickname
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block font-sans">
                      Email Address <span className="font-normal text-xs text-neutral-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <input
                      id="whatsapp-opt-in"
                      type="checkbox"
                      checked={whatsappOptIn}
                      onChange={(e) => setWhatsappOptIn(e.target.checked)}
                      className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-neutral-300 rounded"
                    />
                    <label htmlFor="whatsapp-opt-in" className="text-xs text-neutral-600 leading-normal select-none">
                      I agree to receive dynamic prediction results and updates on WhatsApp.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={registerMutation.isPending}
                    className="w-full py-3.5 bg-neutral-900 text-white font-semibold text-sm rounded-xl hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-98 transition flex items-center justify-center space-x-2 disabled:bg-neutral-300"
                  >
                    {registerMutation.isPending ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Joining Arena...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Challenge</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>

            ) : (

              /* STAGE 2: ACTIVE PARTICIPATION DASHBOARD */
              <motion.div
                key="dashboard-stage"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                
                {/* Scorecard Profile */}
                <div className="bg-neutral-900 text-white rounded-3xl p-5 shadow-xl border border-neutral-805 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Competitor</p>
                    <h3 className="font-bold text-base tracking-tight text-white">{participant.name}</h3>
                    <p className="text-xs text-neutral-400 font-mono">{participant.phone}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Score</p>
                      <span className="font-extrabold text-2xl text-emerald-400 font-mono tracking-tight">
                        {participant.totalPoints || 0}
                      </span>
                      <span className="text-xs text-neutral-400 font-semibold ml-1">pts</span>
                    </div>

                    <button
                      onClick={handleLogout}
                      title="Logout / Disconnect"
                      className="p-2.5 bg-neutral-850 hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-rose-400 transition"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* DYNAMIC Rewards Dashboard Banner */}
                {campaign.rewardsDescription && (
                  <div className="bg-linear-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
                      <Trophy className="h-24 w-24" />
                    </div>
                    <div className="space-y-1 pr-4 relative z-10">
                      <h3 className="font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                        <Gift className="h-4 w-4" /> Unlocking Rewards
                      </h3>
                      <p className="text-xs text-emerald-50 leading-snug whitespace-pre-wrap">
                        {campaign.rewardsDescription}
                      </p>
                    </div>
                    <div className="shrink-0 h-11 w-11 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 relative z-10 shadow-inner">
                      <Ticket className="h-5 w-5 text-white drop-shadow-md" />
                    </div>
                  </div>
                )}

                {/* ACTIVE QUESTIONS BOARD */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-neutral-400 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <span>Open Predictions ({activeEvents.length})</span>
                  </h3>

                  {activeEvents.length === 0 ? (
                    <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center space-y-1">
                      <Clock className="mx-auto h-7 w-7 text-neutral-300" />
                      <h4 className="text-sm font-semibold text-neutral-800">All submissions locked!</h4>
                      <p className="text-xs text-neutral-400">There are no prediction events open right now. Check back soon.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeEvents.map((evt) => {
                        const isMatch = evt.type === 'match';
                        const teamA = evt.metadata.teamA || 'Team A';
                        const teamB = evt.metadata.teamB || 'Team B';

                        return (
                          <div
                            key={evt.id}
                            className="bg-white border border-neutral-150 rounded-2xl p-5 hover:shadow-md transition flex flex-col space-y-4"
                          >
                            <div className="flex items-start justify-between">
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {isMatch ? 'Match prediction' : 'Trivia Question'}
                              </span>
                              <div className="flex items-center space-x-1 text-neutral-400 font-mono text-[10px]">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Closes: {new Date(evt.endTime).toLocaleDateString()}</span>
                              </div>
                            </div>

                            <div className="text-sm font-bold text-neutral-900 font-sans tracking-tight leading-snug">
                              {evt.label}
                            </div>

                            {/* Predictive Prompt Selection Panel */}
                            {selectedEvent?.id === evt.id ? (
                              <form onSubmit={handleSubmission} className="pt-2 border-t border-neutral-100 space-y-3">
                                {submitError && (
                                  <div className="bg-rose-50 text-rose-600 text-xs p-2 rounded-xl border border-rose-100 flex items-center space-x-1.5">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{submitError}</span>
                                  </div>
                                )}

                                <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                                  Your prediction:
                                </p>

                                {isMatch ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setPredictionAnswer(`${teamA} Win`)}
                                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition ${
                                        predictionAnswer === `${teamA} Win`
                                          ? 'bg-neutral-900 text-white border-neutral-900'
                                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                                      }`}
                                    >
                                      {teamA}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPredictionAnswer('Draw')}
                                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition ${
                                        predictionAnswer === 'Draw'
                                          ? 'bg-neutral-900 text-white border-neutral-900'
                                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                                      }`}
                                    >
                                      Draw
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPredictionAnswer(`${teamB} Win`)}
                                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition ${
                                        predictionAnswer === `${teamB} Win`
                                          ? 'bg-neutral-900 text-white border-neutral-900'
                                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                                      }`}
                                    >
                                      {teamB}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col space-y-1.5">
                                    {evt.metadata.choices && evt.metadata.choices.length > 0 ? (
                                      evt.metadata.choices.map((choice, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setPredictionAnswer(choice)}
                                          className={`py-2.5 px-4 text-xs font-semibold text-left rounded-xl border transition ${
                                            predictionAnswer === choice
                                              ? 'bg-neutral-900 text-white border-neutral-900'
                                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                                          }`}
                                        >
                                          {choice}
                                        </button>
                                      ))
                                    ) : (
                                      <input
                                        type="text"
                                        required
                                        value={predictionAnswer}
                                        onChange={(e) => setPredictionAnswer(e.target.value)}
                                        placeholder="Write your answer..."
                                        className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition"
                                      />
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center space-x-2 pt-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEvent(null);
                                      setPredictionAnswer('');
                                      setSubmitError(null);
                                    }}
                                    className="px-3.5 py-2 hover:bg-neutral-100 text-neutral-500 font-semibold text-xs rounded-xl transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={!predictionAnswer || submitResponseMutation.isPending}
                                    className="px-5 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 shadow-sm transition disabled:bg-neutral-200 disabled:text-neutral-400"
                                  >
                                    {submitResponseMutation.isPending ? 'Saving...' : 'Lock Prediction'}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedEvent(evt);
                                  setPredictionAnswer('');
                                  setSubmitError(null);
                                }}
                                className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl font-bold text-xs tracking-wide text-neutral-800 transition flex items-center justify-center space-x-1"
                              >
                                <span>Cast Your Vote</span>
                                <ChevronRight className="h-3.5 w-3.5 font-bold" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SUBMITTED / PENDING RESOLUTION */}
                {pendingEvents.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#a3a3a3] flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Saved Predictions ({pendingEvents.length})</span>
                    </h3>

                    <div className="space-y-2.5">
                      {pendingEvents.map(evt => {
                        const userResp = responses.find(r => r.eventId === evt.id);
                        const isResolved = evt.correctAnswer !== null && evt.correctAnswer !== undefined;
                        const isWinner = isResolved && evt.correctAnswer === userResp?.answer;

                        return (
                          <div 
                            key={evt.id} 
                            className="bg-white border border-neutral-150 rounded-2xl p-4 flex items-center justify-between"
                          >
                            <div className="space-y-1 pr-3 max-w-[70%]">
                              <h4 className="text-xs font-semibold text-neutral-400 truncate tracking-wide">
                                {evt.label}
                              </h4>
                              <div className="flex items-center space-x-1">
                                <span className="font-bold text-xs text-neutral-800">
                                  Choice: {userResp?.answer}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isResolved ? (
                                <div className={`flex flex-col items-end ${isWinner ? 'text-emerald-600' : 'text-neutral-400'}`}>
                                  <span className="font-mono font-black text-xs">
                                    {isWinner ? `+${userResp?.pointsAwarded || 0} pts` : '0 pts'}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold tracking-wider">
                                    {isWinner ? 'Correct' : 'Closed'}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 text-[10px] font-bold rounded-full tracking-wide">
                                  Prediction Locked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CLOSED EVENTS WITH NO ANSWER */}
                {closedEvents.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#a3a3a3] flex items-center space-x-1.5">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <span>Past Submissions Closed ({closedEvents.length})</span>
                    </h3>

                    <div className="space-y-2.5">
                      {closedEvents.map(evt => (
                        <div 
                          key={evt.id} 
                          className="bg-neutral-100 rounded-2xl p-4 flex items-center justify-between border border-neutral-200"
                        >
                          <div className="space-y-0.5 max-w-[80%] pr-3">
                            <h4 className="text-xs font-bold text-neutral-500 tracking-tight">
                              {evt.label}
                            </h4>
                            <p className="text-[10px] text-neutral-400">Locked without prediction</p>
                          </div>
                          
                          <div className="text-right text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                            Expired
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="py-6 pt-10 text-center">
          <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">
            {client.name} Fan Zone Solutions • Secure Prediction Hub
          </p>
        </footer>

      </div>
    </div>
  );
}