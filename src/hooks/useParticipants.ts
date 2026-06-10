import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getCampaignByPublicId, 
  getParticipants, 
  getParticipantById, 
  createParticipant, 
  updateParticipant, 
  getResponses, 
  createResponse,
  getAllResponsesForCampaign
} from '../services/firebaseParticipantService';
import { getEvents } from '../services/firebaseEventService';
import { Participant, CampaignResponse } from '../types';

export function useCampaignAndClient(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaignAndClient', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const res = await getCampaignByPublicId(campaignId);
      if (!res) throw new Error(`Campaign "${campaignId}" not found`);
      return res;
    },
    enabled: !!campaignId,
  });
}

export function useCampaignEvents(clientId: string | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaignEvents', clientId, campaignId],
    queryFn: async () => {
      if (!clientId || !campaignId) return [];
      return getEvents(clientId, campaignId);
    },
    enabled: !!clientId && !!campaignId,
  });
}

export function useCampaignParticipants(clientId: string | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: ['participants', clientId, campaignId],
    queryFn: async () => {
      if (!clientId || !campaignId) return [];
      return getParticipants(clientId, campaignId);
    },
    enabled: !!clientId && !!campaignId,
  });
}

export function useParticipantDetails(clientId: string | undefined, campaignId: string | undefined, participantId: string | undefined) {
  return useQuery({
    queryKey: ['participant', clientId, campaignId, participantId],
    queryFn: async () => {
      if (!clientId || !campaignId || !participantId) return null;
      return getParticipantById(clientId, campaignId, participantId);
    },
    enabled: !!clientId && !!campaignId && !!participantId,
  });
}

export function useParticipantResponses(clientId: string | undefined, campaignId: string | undefined, participantId: string | undefined) {
  return useQuery({
    queryKey: ['responses', clientId, campaignId, participantId],
    queryFn: async () => {
      if (!clientId || !campaignId || !participantId) return [];
      return getResponses(clientId, campaignId, participantId);
    },
    enabled: !!clientId && !!campaignId && !!participantId,
  });
}

export function useRegisterParticipantMutation(clientId: string | undefined, campaignId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (participantData: Omit<Participant, 'createdAt' | 'updatedAt' | 'totalPoints'>) => {
      if (!clientId || !campaignId) throw new Error('Missing client or campaign parameters');
      await createParticipant(clientId, campaignId, participantData);
      return participantData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['participants', clientId, campaignId] });
      queryClient.invalidateQueries({ queryKey: ['participant', clientId, campaignId, data.id] });
    },
  });
}

export function useSubmitResponseMutation(clientId: string | undefined, campaignId: string | undefined, participantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseData: Omit<CampaignResponse, 'createdAt' | 'updatedAt' | 'pointsAwarded'>) => {
      if (!clientId || !campaignId || !participantId) throw new Error('Missing routing context');
      await createResponse(clientId, campaignId, participantId, responseData);
      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['responses', clientId, campaignId, participantId] });
    },
  });
}

export function useAllCampaignResponses(clientId: string | undefined, campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaignResponsesAll', clientId, campaignId],
    queryFn: async () => {
      if (!clientId || !campaignId) return [];
      return getAllResponsesForCampaign(clientId, campaignId);
    },
    enabled: !!clientId && !!campaignId,
  });
}

