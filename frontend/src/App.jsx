import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Landing from './components/Landing';
import ScanID from './components/ScanID';
import ChooseRole from './components/ChooseRole';
import BorrowReason from './components/BorrowReason';
import BorrowAmount from './components/BorrowAmount';
import BorrowRisk from './components/BorrowRisk';
import BorrowOptions from './components/BorrowOptions';
import PostPreview from './components/PostPreview';
import CommunityFeed from './components/CommunityFeed';
import LenderSetup from './components/LenderSetup';
import DashboardBorrower from './components/DashboardBorrower';
import DashboardLender from './components/DashboardLender';

export default function App() {
  const location = useLocation();

  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
    },
    in: {
      opacity: 1,
      scale: 1,
    },
    out: {
      opacity: 0,
      scale: 1.05,
    },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 md:py-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/scan-id" element={<ScanID />} />
            <Route path="/choose-role" element={<ChooseRole />} />
            <Route path="/borrow/reason" element={<BorrowReason />} />
            <Route path="/borrow/amount" element={<BorrowAmount />} />
            <Route path="/borrow/risk" element={<BorrowRisk />} />
            <Route path="/borrow/options" element={<BorrowOptions />} />
            <Route path="/post/preview" element={<PostPreview />} />
            <Route path="/feed" element={<CommunityFeed />} />
            <Route path="/lender/setup" element={<LenderSetup />} />
            <Route path="/dashboard/borrower" element={<DashboardBorrower />} />
            <Route path="/dashboard/lender" element={<DashboardLender />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
