export const BORROWER_FLOW_STEPS = [
  { id: 'reason', label: 'Story', path: '/borrow/reason' },
  { id: 'amount', label: 'Amount', path: '/borrow/amount' },
  { id: 'risk', label: 'Risk Check', path: '/borrow/risk' },
  { id: 'options', label: 'Offers', path: '/borrow/options' },
];

export const LENDER_FLOW_STEPS = [
  { id: 'setup', label: 'Pool Setup', path: '/lender/setup' },
  { id: 'match', label: 'Match Offers', path: '/lender/match' },
  { id: 'live', label: 'Live Lending', path: '/lender/live' },
];
