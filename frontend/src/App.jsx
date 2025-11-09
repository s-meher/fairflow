import { Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import ScanID from './components/ScanID';
import ChooseRole from './components/ChooseRole';
import BorrowReason from './components/BorrowReason';
import BorrowAmount from './components/BorrowAmount';
import BorrowRisk from './components/BorrowRisk';
import BorrowOptions from './components/BorrowOptions';
import CommunityFeed from './components/CommunityFeed';
import LenderSetup from './components/LenderSetup';
import DashboardHome from './components/DashboardHome';
import DashboardBorrower from './components/DashboardBorrower';
import DashboardLender from './components/DashboardLender';
import { FloatingFinanceBot } from './components/FinanceBot';

export default function App() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center px-4 py-10 md:py-16">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scan-id" element={<ScanID />} />
        <Route path="/choose-role" element={<ChooseRole />} />
        <Route path="/borrow/reason" element={<BorrowReason />} />
        <Route path="/borrow/amount" element={<BorrowAmount />} />
        <Route path="/borrow/risk" element={<BorrowRisk />} />
        <Route path="/borrow/options" element={<BorrowOptions />} />
        <Route path="/feed" element={<CommunityFeed />} />
        <Route path="/lender/setup" element={<LenderSetup />} />
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/borrower" element={<DashboardBorrower />} />
        <Route path="/dashboard/lender" element={<DashboardLender />} />
        <Route path="*" element={<Landing />} />
      </Routes>
      <FloatingFinanceBot />
    </div>
  );
}
