import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isSandboxActive } from '../services/sandboxService';

interface ScoreEventParams {
  clientId: string;
  campaignId: string;
  eventId: string;
  correctAnswer: string;
}

/**
 * Universal Hook to score event responses.
 * Detects if Sandbox mode is active to execute entirely inside local storage state,
 * or triggers the secure Express server-side Scoring endpoint when live.
 */
export function useScoreEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ScoreEventParams) => {
      const { clientId, campaignId, eventId, correctAnswer } = params;

      if (isSandboxActive()) {
        // --- SANDBOX MODE: LOCAL SCORING ENGINE ---
        const { getSandboxCampaignById, getSandboxParticipants, getSandboxResponses, getSandboxAllResponsesForCampaign } = await import('../services/sandboxService');

        const campaign = getSandboxCampaignById(clientId, campaignId);
        if (!campaign) {
          throw new Error('Sandbox campaign not found for scoring.');
        }

        const scoringRules = campaign.config.scoringRules || {
          correctPredictionPoints: 10,
          participationPoints: 2,
          bonusPoints: 0
        };

        // Fetch participants and apply local point distribution
        const participants = getSandboxParticipants(campaignId);
        const allResponses = getSandboxAllResponsesForCampaign(campaignId);

        let scouredResponses = 0;
        let updatedParticipants = 0;

        // Mutate sandbox arrays in localStorage
        const localParticipants = [...participants].map(p => {
          // Fetch this individual participant's responses
          const pResponses = getSandboxResponses(campaignId, p.id);
          
          let sumTotalPoints = 0;

          // 1. Calculate and update individual response scores
          const updatedResponsesList = getSandboxResponses(campaignId, p.id).map(r => {
            if (r.eventId === eventId) {
              const isCorrect = r.answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
              const pointsAllocated = isCorrect 
                ? Number(scoringRules.correctPredictionPoints || 10) 
                : Number(scoringRules.participationPoints || 0);

              scouredResponses++;
              return {
                ...r,
                pointsAwarded: pointsAllocated,
                updatedAt: new Date().toISOString()
              };
            }
            return r;
          });

          // Save responses back to local lists
          const rawResponses = JSON.parse(localStorage.getItem('predictive_sandbox_responses') || '[]');
          const filteredRaw = rawResponses.filter((item: any) => !(item.campaignId === campaignId && item.participantId === p.id));
          localStorage.setItem('predictive_sandbox_responses', JSON.stringify([...filteredRaw, ...updatedResponsesList]));

          // Recalculate participant point sums from all associated responses
          const freshResponses = [...updatedResponsesList];
          // Gather other unchanged responses
          const otherSavedResponses = rawResponses.filter((r: any) => r.campaignId === campaignId && r.participantId === p.id && r.eventId !== eventId);
          const completeResponses = [...freshResponses, ...otherSavedResponses];

          sumTotalPoints = completeResponses.reduce((acc, curr) => acc + (curr.pointsAwarded || 0), 0);
          updatedParticipants++;

          return {
            ...p,
            totalPoints: sumTotalPoints,
            updatedAt: new Date().toISOString()
          };
        });

        // Save updated participants
        localStorage.setItem('predictive_sandbox_participants', JSON.stringify(localParticipants));

        // Update correct answer on the target event
        const rawEvents = JSON.parse(localStorage.getItem('predictive_sandbox_events') || '[]');
        const updatedEvents = rawEvents.map((e: any) => {
          if (e.id === eventId) {
            return {
              ...e,
              correctAnswer,
              updatedAt: new Date().toISOString()
            };
          }
          return e;
        });
        localStorage.setItem('predictive_sandbox_events', JSON.stringify(updatedEvents));

        return {
          success: true,
          message: 'Local sandbox scoring engine evaluated matches successfully',
          summary: {
            scouredResponses,
            updatedParticipants,
            correctAnswer
          }
        };
      }

      // --- LIVE CLOUD CONTEXT: DEFER TO CLOUD STORAGE WEB ENDPOINT ---
      const response = await fetch('/api/functions/score-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server Scoring function returned error status.');
      }

      return data;
    },
    onSuccess: () => {
      // Refresh current participants list and active leaderboards
      queryClient.invalidateQueries({ queryKey: ['participants'] });
      queryClient.invalidateQueries({ queryKey: ['campaignEvents'] });
    }
  });
}
