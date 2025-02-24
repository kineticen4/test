import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CategoryBrowse from './pages/CategoryBrowse';
import Search from './pages/Search';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminAccounts from './pages/admin/Accounts';
import AdminAccountApprovals from './pages/admin/AccountApprovals';
import AdminFranchiseApprovals from './pages/admin/FranchiseApprovals';
import AdminMessages from './pages/admin/Messages';
import AdminFeaturedAds from './pages/admin/FeaturedAds';
import AdminAdvertisingSettings from './pages/admin/AdvertisingSettings';
import FranchisorLogin from './pages/franchisor/Login';
import FranchisorSignup from './pages/franchisor/Signup';
import FranchisorDashboard from './pages/franchisor/Dashboard';
import AddFranchise from './pages/franchisor/AddFranchise';
import EditFranchise from './pages/franchisor/EditFranchise';
import Franchises from './pages/franchisor/Franchises';
import Support from './pages/franchisor/Support';
import FeaturedAds from './pages/franchisor/FeaturedAds';
import Leads from './pages/franchisor/Leads';
import CustomerLogin from './pages/customer/Login';
import CustomerSignup from './pages/customer/Signup';
import CustomerDashboard from './pages/customer/Dashboard';
import FranchisorFranchises from './pages/admin/FranchisorFranchises';
import FranchiseDetails from './pages/FranchiseDetails';
import MainFooter from './components/MainFooter';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-100">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/category/:categoryId" element={<CategoryBrowse />} />
            <Route path="/franchise/:id" element={<FranchiseDetails />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/accounts" element={<AdminAccounts />} />
            <Route path="/admin/account-approvals" element={<AdminAccountApprovals />} />
            <Route path="/admin/franchise-approvals" element={<AdminFranchiseApprovals />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/advertising/featured" element={<AdminFeaturedAds />} />
            <Route path="/admin/advertising/settings" element={<AdminAdvertisingSettings />} />
            <Route path="/admin/franchisor/:franchisorId/franchises" element={<FranchisorFranchises />} />
            <Route path="/franchisor/login" element={<FranchisorLogin />} />
            <Route path="/franchisor/signup" element={<FranchisorSignup />} />
            <Route path="/franchisor/dashboard" element={<FranchisorDashboard />} />
            <Route path="/franchisor/add-franchise" element={<AddFranchise />} />
            <Route path="/franchisor/franchise/:id/edit" element={<EditFranchise />} />
            <Route path="/franchisor/franchises" element={<Franchises />} />
            <Route path="/franchisor/leads" element={<Leads />} />
            <Route path="/franchisor/support" element={<Support />} />
            <Route path="/franchisor/advertising/featured" element={<FeaturedAds />} />
            <Route path="/customer/login" element={<CustomerLogin />} />
            <Route path="/customer/signup" element={<CustomerSignup />} />
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          </Routes>
        </div>
        <MainFooter />
      </div>
    </Router>
  );
}

export default App;