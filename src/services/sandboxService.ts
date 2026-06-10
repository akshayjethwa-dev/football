import { Client, Campaign, CampaignEvent, Participant, CampaignResponse, Coupon } from '../types';

export function isSandboxActive(): boolean {
  return localStorage.getItem('predictive_sandbox_active') === 'true';
}

export function setSandboxActive(active: boolean) {
  localStorage.setItem('predictive_sandbox_active', active ? 'true' : 'false');
}

// Clients Seed Data
const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'ashrey-cafe',
    name: 'Ashrey Premium Espresso Bar',
    type: 'cafe',
    contactPerson: 'Arjun Ashrey',
    contactEmail: 'arjun@ashreycafe.com',
    contactPhone: '+1-555-0199',
    senderNumber: '+12015550143',
    logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=200',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bengaluru-fc',
    name: 'Bengaluru FC Arena',
    type: 'other',
    contactPerson: 'Sanjay Reddy',
    contactEmail: 'sanjay@bengalurufc.in',
    contactPhone: '+91-80-5555-1212',
    senderNumber: '+19255550181',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=200',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Campaigns Seed Data
const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'fanzone-world-cup',
    clientId: 'ashrey-cafe',
    name: 'FIFA World Cup Fan Zone Predictor',
    description: 'Score complimentary lattes and custom merchandise by predicting match outcomes live during the World Cup season!',
    eventType: 'football_world_cup',
    gameType: 'prediction',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date(Date.now() + 30 * 86450 * 1000).toISOString().substring(0, 10),
    status: 'active',
    config: {
      scoringRules: {
        correctPredictionPoints: 10,
        participationPoints: 2,
        bonusPoints: 5
      },
      maxSubmissionsPerEvent: 1,
      channelsEnabled: ['web_form']
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Events Seed data
const DEFAULT_EVENTS: CampaignEvent[] = [
  {
    id: 'india-vs-mexico',
    campaignId: 'fanzone-world-cup',
    type: 'match',
    label: 'India vs Mexico – Opening Group Playoff',
    startTime: new Date().toISOString().substring(0, 16),
    endTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString().substring(0, 16),
    metadata: {
      teamA: 'India',
      teamB: 'Mexico',
      group: 'Group A',
      imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400'
    },
    correctAnswer: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'world-cup-quiz-v1',
    campaignId: 'fanzone-world-cup',
    type: 'question',
    label: 'Who won the first ever FIFA Golden Glove award?',
    startTime: new Date().toISOString().substring(0, 16),
    endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString().substring(0, 16),
    metadata: {
      choices: ['Oliver Kahn', 'Michel Preudhomme', 'Lev Yashin', 'Fabien Barthez'],
      group: 'Trivia Pool A'
    },
    correctAnswer: 'Michel Preudhomme',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Local Helpers with Storage Check
function getStored<T>(key: string, defaults: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaults;
  }
}

function writeStored<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list));
}

// 1. Clients Sandbox Operations
export function getSandboxClients(): Client[] {
  return getStored<Client>('predictive_sandbox_clients', DEFAULT_CLIENTS);
}

export function getSandboxClientById(id: string): Client | null {
  const list = getSandboxClients();
  return list.find(c => c.id === id) || null;
}

export function createSandboxClient(client: Client): void {
  const list = getSandboxClients();
  const updated = [client, ...list.filter(c => c.id !== client.id)];
  writeStored('predictive_sandbox_clients', updated);
}

export function updateSandboxClient(id: string, updates: Partial<Client>): void {
  const list = getSandboxClients();
  const updated = list.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
  writeStored('predictive_sandbox_clients', updated);
}

export function deleteSandboxClient(id: string): void {
  const list = getSandboxClients();
  const updated = list.filter(c => c.id !== id);
  writeStored('predictive_sandbox_clients', updated);
}

// 2. Campaigns Sandbox Operations
export function getSandboxCampaigns(clientId: string): Campaign[] {
  const all = getStored<Campaign>('predictive_sandbox_campaigns', DEFAULT_CAMPAIGNS);
  return all.filter(c => c.clientId === clientId);
}

export function getSandboxCampaignById(clientId: string, campaignId: string): Campaign | null {
  const all = getStored<Campaign>('predictive_sandbox_campaigns', DEFAULT_CAMPAIGNS);
  return all.find(c => c.clientId === clientId && c.id === campaignId) || null;
}

export function createSandboxCampaign(clientId: string, campaign: Campaign): void {
  const all = getStored<Campaign>('predictive_sandbox_campaigns', DEFAULT_CAMPAIGNS);
  const updated = [campaign, ...all.filter(c => c.id !== campaign.id)];
  writeStored('predictive_sandbox_campaigns', updated);
}

export function updateSandboxCampaign(clientId: string, campaignId: string, updates: Partial<Campaign>): void {
  const all = getStored<Campaign>('predictive_sandbox_campaigns', DEFAULT_CAMPAIGNS);
  const updated = all.map(c => c.id === campaignId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
  writeStored('predictive_sandbox_campaigns', updated);
}

export function deleteSandboxCampaign(clientId: string, campaignId: string): void {
  const all = getStored<Campaign>('predictive_sandbox_campaigns', DEFAULT_CAMPAIGNS);
  const updated = all.filter(c => c.id !== campaignId);
  writeStored('predictive_sandbox_campaigns', updated);
}

// 3. Events Sandbox Operations
export function getSandboxEvents(clientId: string, campaignId: string): CampaignEvent[] {
  const all = getStored<CampaignEvent>('predictive_sandbox_events', DEFAULT_EVENTS);
  return all.filter(e => e.campaignId === campaignId);
}

export function getSandboxEventById(clientId: string, campaignId: string, eventId: string): CampaignEvent | null {
  const all = getStored<CampaignEvent>('predictive_sandbox_events', DEFAULT_EVENTS);
  return all.find(e => e.campaignId === campaignId && e.id === eventId) || null;
}

export function createSandboxEvent(clientId: string, campaignId: string, event: CampaignEvent): void {
  const all = getStored<CampaignEvent>('predictive_sandbox_events', DEFAULT_EVENTS);
  const updated = [...all.filter(e => e.id !== event.id), event];
  writeStored('predictive_sandbox_events', updated);
}

export function updateSandboxEvent(clientId: string, campaignId: string, eventId: string, updates: Partial<CampaignEvent>): void {
  const all = getStored<CampaignEvent>('predictive_sandbox_events', DEFAULT_EVENTS);
  const updated = all.map(e => e.id === eventId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e);
  writeStored('predictive_sandbox_events', updated);
}

export function deleteSandboxEvent(clientId: string, campaignId: string, eventId: string): void {
  const all = getStored<CampaignEvent>('predictive_sandbox_events', DEFAULT_EVENTS);
  const updated = all.filter(e => e.id !== eventId);
  writeStored('predictive_sandbox_events', updated);
}

// 4. Participant Sandbox Operations
export function getSandboxParticipants(campaignId: string): Participant[] {
  const all = getStored<Participant>('predictive_sandbox_participants', []);
  return all.filter(p => p.campaignId === campaignId);
}

export function createSandboxParticipant(participant: Participant): void {
  const all = getStored<Participant>('predictive_sandbox_participants', []);
  const updated = [participant, ...all.filter(p => p.id !== participant.id)];
  writeStored('predictive_sandbox_participants', updated);
}

export function updateSandboxParticipant(campaignId: string, id: string, updates: Partial<Participant>): void {
  const all = getStored<Participant>('predictive_sandbox_participants', []);
  const updated = all.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p);
  writeStored('predictive_sandbox_participants', updated);
}

export function deleteSandboxParticipant(campaignId: string, id: string): void {
  const all = getStored<Participant>('predictive_sandbox_participants', []);
  const updated = all.filter(p => p.id !== id);
  writeStored('predictive_sandbox_participants', updated);
}

export function getSandboxParticipantById(campaignId: string, id: string): Participant | null {
  const all = getStored<Participant>('predictive_sandbox_participants', []);
  return all.find(p => p.id === id && p.campaignId === campaignId) || null;
}

// 5. Response Sandbox Operations
export function getSandboxResponses(campaignId: string, participantId: string): CampaignResponse[] {
  const all = getStored<CampaignResponse>('predictive_sandbox_responses', []);
  return all.filter(r => r.campaignId === campaignId && r.participantId === participantId);
}

export function getSandboxAllResponsesForCampaign(campaignId: string): CampaignResponse[] {
  const all = getStored<CampaignResponse>('predictive_sandbox_responses', []);
  return all.filter(r => r.campaignId === campaignId);
}

export function createSandboxResponse(response: CampaignResponse): void {
  const all = getStored<CampaignResponse>('predictive_sandbox_responses', []);
  const updated = [...all.filter(r => r.id !== response.id), response];
  writeStored('predictive_sandbox_responses', updated);
}

// 6. Coupons Sandbox Operations
export function getSandboxCoupons(campaignId: string): Coupon[] {
  const all = getStored<Coupon>('predictive_sandbox_coupons', []);
  return all.filter(c => c.campaignId === campaignId);
}

export function createSandboxCoupons(coupons: Coupon[]): void {
  const all = getStored<Coupon>('predictive_sandbox_coupons', []);
  const updated = [...all, ...coupons];
  writeStored('predictive_sandbox_coupons', updated);
}

export function updateSandboxCoupon(campaignId: string, id: string, updates: Partial<Coupon>): void {
  const all = getStored<Coupon>('predictive_sandbox_coupons', []);
  const updated = all.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
  writeStored('predictive_sandbox_coupons', updated);
}


