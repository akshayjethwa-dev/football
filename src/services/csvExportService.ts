/**
 * Utility service to safely sanitize and export datasets as CSV downloads in browser environment.
 */

/**
 * Escapes characters for CSV format safety
 */
export function escapeCSVCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Packages rows into a blob and triggers download
 */
export function downloadCSV(filename: string, headers: string[], rows: any[][]): void {
  const headerLine = headers.map(escapeCSVCell).join(',');
  const rowLines = rows.map(r => r.map(escapeCSVCell).join(','));
  const csvContent = [headerLine, ...rowLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers participant export
 */
export function exportParticipantsCSV(campaignId: string, participants: any[]): void {
  const headers = ['Participant ID', 'Name', 'Phone', 'Email', 'Source', 'WhatsApp Opt-In', 'Total Points', 'Registered At'];
  const rows = participants.map(p => [
    p.id,
    p.name,
    p.phone,
    p.email || '',
    p.source || 'qrcode',
    p.whatsappOptIn ? 'Yes' : 'No',
    p.totalPoints || 0,
    p.createdAt ? new Date(p.createdAt).toISOString() : ''
  ]);

  downloadCSV(`Campaign_${campaignId}_Participants_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Triggers leaderboard export
 */
export function exportLeaderboardCSV(campaignId: string, standings: any[]): void {
  const headers = ['Rank', 'Name', 'Phone', 'Email', 'Source', 'Predictions Guessed', 'Correct Predictions', 'Total Points (XP)'];
  const rows = standings.map((s, idx) => [
    idx + 1,
    s.name,
    s.phone,
    s.email || '',
    s.source || '',
    s.predictionsSubmitted || 0,
    s.correctAnswersCount || 0,
    s.totalPoints || 0
  ]);

  downloadCSV(`Campaign_${campaignId}_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Triggers coupons export
 */
export function exportCouponsCSV(campaignId: string, coupons: any[], participantsLookup: Record<string, string>): void {
  const headers = ['Coupon ID', 'Code', 'Reward Description', 'Status', 'Assigned Participant ID', 'Winner Name', 'Valid From', 'Valid To', 'Created At'];
  const rows = coupons.map(c => {
    const winnerName = c.participantId ? (participantsLookup[c.participantId] || 'Unknown Nominative') : 'Unassigned';
    return [
      c.id,
      c.code,
      c.metadata?.description || '',
      c.status,
      c.participantId || 'None',
      winnerName,
      c.metadata?.validFrom || '',
      c.metadata?.validTo || '',
      c.createdAt ? new Date(c.createdAt).toISOString() : ''
    ];
  });

  downloadCSV(`Campaign_${campaignId}_Coupons_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}
