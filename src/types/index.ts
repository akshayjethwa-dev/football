export type ClientType = 'cafe' | 'retailer' | 'gym' | 'B2B' | 'other';
export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  senderNumber?: string;
  status: ClientStatus;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export type UserRole = 'superadmin' | 'clientadmin';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  clientId: string | null;
  createdAt: any;
  updatedAt: any;
}

export type CampaignEventType = 'football_world_cup' | 'cricket' | 'festival' | 'custom';
export type CampaignGameType = 'prediction' | 'quiz' | 'referral' | 'mixed';
export type CampaignStatus = 'draft' | 'active' | 'archived';
export type ChannelType = 'whatsapp' | 'web_form';

export interface ScoringRules {
  correctPredictionPoints: number;
  participationPoints: number;
  bonusPoints: number;
}

export interface CampaignConfig {
  scoringRules: ScoringRules;
  maxEventsPerParticipant?: number;
  maxSubmissionsPerEvent: number;
  channelsEnabled: ChannelType[];
}

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  description: string;
  eventType: CampaignEventType;
  gameType: CampaignGameType;
  startDate: string; // ISO string for high reliability on input
  endDate: string; // ISO string
  status: CampaignStatus;
  config: CampaignConfig;
  createdAt: any; // Firestore Timestamp or Date
  updatedAt: any; // Firestore Timestamp or Date
}

export type CampaignEventTypeMatchOrQuestion = 'match' | 'question';

export interface EventMetadata {
  teamA?: string;
  teamB?: string;
  group?: string;
  imageUrl?: string;
  choices?: string[]; // for questions
}

export interface EventScoringConfigOverride {
  correctPoints?: number;
  participationPoints?: number;
}

export interface CampaignEvent {
  id: string;
  campaignId: string;
  type: CampaignEventTypeMatchOrQuestion;
  label: string;
  startTime: string; // ISO string for form input
  endTime: string; // ISO string
  metadata: EventMetadata;
  correctAnswer: string | null;
  scoringConfig?: EventScoringConfigOverride;
  createdAt: any;
  updatedAt: any;
}

export type ParticipantSource = 'landing_page' | 'qr' | 'manual_import' | 'whatsapp_optin';

export interface Participant {
  id: string;
  campaignId: string;
  clientId: string;
  name: string;
  phone: string;
  email?: string;
  source: ParticipantSource;
  whatsappOptIn: boolean;
  totalPoints: number;
  createdAt: any;
  updatedAt: any;
}

export interface CampaignResponse {
  id: string;
  participantId: string;
  campaignId: string;
  eventId: string;
  answer: string;
  pointsAwarded: number;
  createdAt: any;
  updatedAt: any;
}

export type CouponStatus = 'unused' | 'used' | 'expired';

export interface Coupon {
  id: string;
  campaignId: string;
  clientId: string;
  code: string;
  participantId: string | null;
  status: CouponStatus;
  metadata: {
    description: string;
    validFrom?: string;
    validTo?: string;
  };
  createdAt: any;
  updatedAt: any;
}



