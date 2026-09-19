import React, { Fragment, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
    HomeIcon,
    CreditCardIcon,
    TagIcon,
    BellIcon,
    CurrencyRupeeIcon,
    ArrowPathIcon,
    XMarkIcon,
    ArrowRightOnRectangleIcon,
    ChartBarIcon,
    BanknotesIcon,
    ChatBubbleBottomCenterTextIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import { DocumentScannerIcon } from '../icons';
import { reportService } from '../../services';

const Sidebar = ({ mobileMenuOpen, setMobileMenuOpen, user, handleLogout, unreadCount }) => {
    const location = useLocation();
    const [healthScore, setHealthScore] = useState(null);
    const [loadingHealth, setLoadingHealth] = useState(true);

    useEffect(() => {
        const fetchHealthScore = async () => {
            try {
                const currentYear = new Date().getFullYear();
                const response = await reportService.getMonthlyTrend(currentYear, true);
                
                let monthlyData = [];
                if (response && response.success && response.data && response.data.monthlyData) {
                    monthlyData = response.data.monthlyData;
                } else if (response && response.data && Array.isArray(response.data)) {
                    monthlyData = response.data;
                } else if (response && Array.isArray(response.monthlyData)) {
                    monthlyData = response.monthlyData;
                } else if (response && Array.isArray(response)) {
                    monthlyData = response;
                }

                if (monthlyData && monthlyData.length > 0) {
                    const totalIncome = monthlyData.reduce((sum, item) => sum + (item?.totalIncome || 0), 0);
                    const totalExpenses = monthlyData.reduce((sum, item) => sum + (item?.totalExpense || 0), 0);
                    const score = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                    setHealthScore(Math.max(0, Math.min(100, Math.round(score))));
                } else {
                    setHealthScore(0);
                }
            } catch (err) {
                console.error('Error fetching health score in sidebar:', err);
                setHealthScore(0);
            } finally {
                setLoadingHealth(false);
            }
        };

        if (mobileMenuOpen) {
            fetchHealthScore();
        }
    }, [mobileMenuOpen]);

    const getHealthDetails = (score) => {
        if (score === null || loadingHealth) return { label: 'Calculating...', color: 'text-gray-400', stroke: 'rgba(255,255,255,0.05)' };
        if (score >= 75) return { label: 'Excellent budget', color: 'text-emerald-400', stroke: '#03D47C' };
        if (score >= 50) return { label: 'Healthy budget', color: 'text-accent-300', stroke: '#02B66A' };
        if (score >= 30) return { label: 'Stable state', color: 'text-amber-400', stroke: '#F2C94C' };
        return { label: 'Needs attention', color: 'text-red-400', stroke: '#EB5757' };
    };

    const healthDetails = getHealthDetails(healthScore);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
        { name: 'Transactions', href: '/transactions', icon: CreditCardIcon },
        { name: 'Categories', href: '/categories', icon: TagIcon },
        { name: 'Reports', href: '/reports', icon: ChartBarIcon },
        { name: 'Budgets', href: '/budgets', icon: CurrencyRupeeIcon },
        { name: 'Recurring', href: '/recurring-transactions', icon: ArrowPathIcon },
        { name: 'Investments', href: '/investments', icon: BanknotesIcon },
        { name: 'Add from SMS', href: '/sms-sync', icon: ChatBubbleBottomCenterTextIcon }
    ];

    const Logo = () => (
        <div className="flex items-center px-6 py-6 group cursor-default">
            <div className="relative flex h-12 w-12 items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <div className="relative flex h-full w-full items-center justify-center rounded-xl bg-white shadow-xl transition-all duration-300 transform rotate-3 group-hover:rotate-6">
                    <CurrencyRupeeIcon className="h-7 w-7 text-accent-400" />
                </div>
                <div className="absolute -right-1 -bottom-1 h-3.5 w-3.5 bg-accent-300 rounded-full border-2 border-[#00301e]"></div>
            </div>
            <div className="ml-4 flex flex-col justify-center">
                <h1 className="text-xl font-display font-bold text-white tracking-tight group-hover:text-accent-300 transition-colors duration-300">
                    Aramco
                    <span className="block text-xs font-sans font-semibold text-accent-300 tracking-[0.25em] uppercase mt-0.5 opacity-90">Finance</span>
                </h1>
            </div>
        </div>
    );

    const NavItem = ({ item, mobile = false, index }) => {
        const isActive = location.pathname === item.href;
        const animationDelay = `${index * 40}ms`;

        return (
            <Link
                key={item.name}
                to={item.href}
                onClick={() => mobile && setMobileMenuOpen(false)}
                style={{ animationDelay }}
                className={`group relative flex items-center px-4 py-3 mx-2 text-sm font-semibold rounded-xl transition-all duration-300 ease-out animate-slide-in-left opacity-0 fill-mode-forwards border-l-4 ${isActive
                    ? 'bg-gradient-to-r from-accent-400/20 to-accent-400/5 text-accent-300 border-accent-300 shadow-md shadow-accent-400/5 translate-x-1'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10 hover:translate-x-1'
                    }`}
            >
                <item.icon
                    className={`h-5 w-5 mr-3 flex-shrink-0 transition-all duration-300 ${isActive ? 'text-accent-300 scale-110 drop-shadow-[0_0_8px_rgba(3,212,124,0.5)]' : 'text-gray-400 group-hover:text-accent-400 group-hover:scale-105'}`}
                    aria-hidden="true"
                />
                <span className="flex-1 font-sans tracking-wide">{item.name}</span>
            </Link>
        );
    };

    const UserProfile = () => (
        <div className="mt-auto border-t border-white/10 p-5 bg-primary-950/80 backdrop-blur-md">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-200 group">
                <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accent-400 to-[#00583E] flex items-center justify-center ring-2 ring-white/20 group-hover:ring-accent-300 transition-all duration-300">
                        <span className="text-sm font-bold text-white">
                            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-accent-300 rounded-full border-2 border-primary-950"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-white truncate font-display">
                            {user?.displayName || 'User'}
                        </p>
                        <span className="text-[9px] bg-accent-400/20 text-accent-300 font-bold px-1.5 py-0.25 rounded-full border border-accent-400/30 uppercase tracking-widest scale-90 origin-left">PRO</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email || 'user@example.com'}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all duration-200"
                    title="Logout"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );

    return (
        <Transition.Root show={mobileMenuOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={setMobileMenuOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-opacity ease-linear duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity ease-linear duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-[#001D30]/80 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 flex justify-start">
                    <Transition.Child
                        as={Fragment}
                        enter="transition ease-in-out duration-300 transform"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition ease-in-out duration-300 transform"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-in-out duration-300"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="ease-in-out duration-300"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setMobileMenuOpen(false)}>
                                        <span className="sr-only">Close sidebar</span>
                                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                                    </button>
                                </div>
                            </Transition.Child>

                            {/* Drawer Content */}
                            <div className="flex grow flex-col overflow-y-auto bg-primary-950/90 backdrop-blur-xl border-r border-white/10 shadow-2xl relative text-white">

                                {/* Glow Overlays */}
                                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                                <div className="absolute -left-20 top-10 w-64 h-64 bg-accent-400/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -right-20 bottom-20 w-64 h-64 bg-[#00583E]/20 rounded-full blur-3xl pointer-events-none" />

                                <Logo />

                                {/* AI Assistant Status Indicator */}
                                <div className="mx-6 mb-4 px-3.5 py-2 rounded-xl bg-accent-950/40 border border-accent-500/25 flex items-center justify-between shadow-inner">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-400"></span>
                                        </span>
                                        <span className="text-xs font-semibold text-accent-300 tracking-wide font-sans flex items-center gap-1">
                                            <SparklesIcon className="h-3.5 w-3.5" />
                                            Aramco AI Assistant
                                        </span>
                                    </div>
                                    <span className="text-[9px] bg-accent-400/20 text-accent-300 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">Online</span>
                                </div>

                                {/* Navigation items */}
                                <nav className="flex flex-1 flex-col px-4 overflow-y-auto">
                                    <ul role="list" className="flex flex-col gap-y-1">
                                        {navigation.map((item, index) => (
                                            <li key={item.name}>
                                                <NavItem item={item} mobile={true} index={index} />
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="h-px bg-white/10 my-4" />

                                    {/* Dashboard Engagement Widgets */}
                                    <div className="flex flex-col gap-3 px-2 mb-6">
                                        {/* Financial Health Score Circle Widget */}
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-[#003626]/60 to-primary-900/40 border border-white/5 shadow-lg relative overflow-hidden group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <p className="text-[10px] text-accent-300/80 font-bold uppercase tracking-wider">Health Score</p>
                                                    {loadingHealth ? (
                                                        <div className="h-6 w-16 bg-white/10 rounded animate-pulse mt-1"></div>
                                                    ) : (
                                                        <p className="text-xl font-extrabold text-white mt-0.5">{healthScore}%</p>
                                                    )}
                                                    <p className={`text-[10px] ${healthDetails.color} font-semibold mt-1`}>
                                                        {healthDetails.label}
                                                    </p>
                                                </div>
                                                <div className="relative h-14 w-14 flex items-center justify-center animate-fade-in">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" fill="transparent" />
                                                        <circle cx="28" cy="28" r="22" 
                                                            stroke={healthDetails.stroke} 
                                                            strokeWidth="3.5" 
                                                            fill="transparent"
                                                            strokeDasharray="138.2" 
                                                            strokeDashoffset={loadingHealth || healthScore === null ? 138.2 : 138.2 - (138.2 * Math.min(100, Math.max(0, healthScore))) / 100} 
                                                            strokeLinecap="round" 
                                                            className="transition-all duration-1000 ease-out" 
                                                        />
                                                    </svg>
                                                    <span className={`absolute text-[10px] font-black ${healthDetails.color}`}>
                                                        {loadingHealth ? '...' : `${healthScore}%`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </nav>

                                {/* Fast Action Button */}
                                <div className="px-6 py-2 mb-2">
                                    <Link
                                        to="/bill-upload"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-accent-400 to-accent-500 hover:from-accent-300 hover:to-accent-400 text-white font-bold text-sm shadow-lg shadow-accent-400/20 hover:shadow-accent-400/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                                    >
                                        <DocumentScannerIcon className="h-5 w-5 animate-pulse" />
                                        <span>Scan Receipt</span>
                                    </Link>
                                </div>

                                <UserProfile />
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default Sidebar;
