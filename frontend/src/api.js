import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export async function createUser(payload) {
  // POST /users/create Request/Response matches backend contract.
  const { data } = await api.post('/users/create', payload);
  return data;
}

export async function verifyId(formData) {
  // POST /verify-id (multipart) -> {verified:boolean, message:string, status:string}
  const { data } = await api.post('/verify-id', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function postBorrowReason(payload) {
  // POST /borrow/reason -> {ok:true}
  const { data } = await api.post('/borrow/reason', payload);
  return data;
}

export async function postBorrowAmount(payload) {
  // POST /borrow/amount -> {ok:true}
  const { data } = await api.post('/borrow/amount', payload);
  return data;
}

export async function fetchBorrowRisk(userId) {
  // GET /borrow/risk -> {score,label,explanation,recommendation}
  const { data } = await api.get('/borrow/risk', { params: { user_id: userId } });
  return data;
}

export async function fetchBorrowOptions(userId) {
  // POST /borrow/options -> {combos:[...]}
  const { data } = await api.post('/borrow/options', { user_id: userId });
  return data;
}

export async function postBorrowDecline(userId) {
  // POST /borrow/decline -> {feedback:string}
  const { data } = await api.post('/borrow/decline', { user_id: userId });
  return data;
}

export async function requestLoan(userId) {
  // POST /loans/request -> {match_id,total_amount,lenders,risk_score,ai_advice}
  const { data } = await api.post('/loans/request', { user_id: userId });
  return data;
}

export async function transferNessie(matchId) {
  // POST /nessie/transfer -> {txn_id,message}
  const { data } = await api.post('/nessie/transfer', { match_id: matchId });
  return data;
}

export async function postFeed(payload) {
  // POST /feed/post -> {post_id,preview}
  const { data } = await api.post('/feed/post', payload);
  return data;
}

export async function fetchFeed() {
  // GET /feed -> {posts:[...]}
  const { data } = await api.get('/feed');
  return data;
}

export async function fetchBorrowerDashboard(userId) {
  // GET /dashboard/borrower -> {next_payment,total_owed_year,savings_vs_bank_year}
  const { data } = await api.get('/dashboard/borrower', { params: { user_id: userId } });
  return data;
}

export async function fetchLenderDashboard(userId) {
  // GET /dashboard/lender -> {next_payment,expected_revenue_year}
  const { data } = await api.get('/dashboard/lender', { params: { user_id: userId } });
  return data;
}

export async function askFinanceBot(payload) {
  // POST /finance-bot -> {reply:string}
  const { data } = await api.post('/finance-bot', payload);
  return data;
}
