import { useMutation } from '@tanstack/react-query';

interface SendWelcomeParams {
  recipientPhone: string;
  name: string;
  campaignName: string;
  campaignId: string;
}

interface SendReminderParams {
  recipientPhone: string;
  name: string;
  eventLabel: string;
  closesInHours: number;
  campaignId: string;
}

/**
 * Hook to trigger the simulated Cloud Function that sends a welcome message
 * after a participant registers.
 */
export function useSendWelcomeMessage() {
  return useMutation({
    mutationFn: async (params: SendWelcomeParams) => {
      const response = await fetch('/api/functions/send-welcome', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed sending welcome message via WhatsApp Cloud Function');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[useSendWelcomeMessage] Hook success response:', data);
    },
    onError: (error) => {
      console.error('[useSendWelcomeMessage] Hook delivery error:', error);
    }
  });
}

/**
 * Hook to trigger the simulated Cloud Function that sends an event prediction lock-in reminder
 * to keep fans active before cutoffs.
 */
export function useSendReminderMessage() {
  return useMutation({
    mutationFn: async (params: SendReminderParams) => {
      const response = await fetch('/api/functions/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed triggering reminder via WhatsApp Cloud Function');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[useSendReminderMessage] Hook success response:', data);
    },
    onError: (error) => {
      console.error('[useSendReminderMessage] Hook delivery error:', error);
    }
  });
}

interface SendCouponParams {
  recipientPhone: string;
  name: string;
  couponCode: string;
  giftDescription: string;
  campaignId: string;
}

/**
 * Hook to trigger the simulated Cloud Function that sends a coupon/reward assignment notification
 * to winners via WhatsApp.
 */
export function useSendCouponMessage() {
  return useMutation({
    mutationFn: async (params: SendCouponParams) => {
      const response = await fetch('/api/functions/send-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed sending coupon message via WhatsApp Cloud Function');
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('[useSendCouponMessage] Hook success response:', data);
    },
    onError: (error) => {
      console.error('[useSendCouponMessage] Hook error:', error);
    }
  });
}

