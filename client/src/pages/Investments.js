import React, { useState, useEffect } from 'react';
import { getInvestments, addInvestment, updateInvestment, deleteInvestment } from '../services/investmentService';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'Fixed Deposit',
    amount: '',
    date: '',
    notes: ''
  });
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const data = await getInvestments();
        setInvestments(data);
      } catch (error) {
        console.error('Error fetching investments:', error);
      }
    };
    fetchInvestments();
  }, []);

  const handleChange = (e) => {
    setNewInvestment({ ...newInvestment, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const addedInvestment = await addInvestment(newInvestment);
      setInvestments([addedInvestment, ...investments]);
      setNewInvestment({
        name: '',
        type: 'Fixed Deposit',
        amount: '',
        date: '',
        notes: ''
      });
      setIsFormVisible(false);
    } catch (error) {
      console.error('Error adding investment:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateInvestment(editingInvestment._id, editingInvestment);
      setInvestments(investments.map(inv => (inv._id === updated._id ? updated : inv)));
      setEditingInvestment(null);
    } catch (error) {
      console.error('Error updating investment:', error.response ? error.response.data : error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInvestment(id);
      setInvestments(investments.filter(inv => inv._id !== id));
    } catch (error) {
      console.error('Error deleting investment:', error.response ? error.response.data : error.message);
    }
  };

  const startEditing = (investment) => {
    setEditingInvestment({ ...investment });
  };

  const cancelEditing = () => {
    setEditingInvestment(null);
  };

  const handleEditChange = (e) => {
    setEditingInvestment({ ...editingInvestment, [e.target.name]: e.target.value });
  };

  const totalInvested = investments.reduce((acc, investment) => acc + investment.amount, 0);

  // Interaction Logic: Sorting/Filtering & Charting
  const investmentTypes = ['Fixed Deposit', 'Mutual Fund (Lump Sum)', 'Gold (One-Time)', 'PPF / NPS', 'Stocks (Lump Purchase)', 'Others'];
  
  const filteredInvestments = filter === 'All' 
    ? investments 
    : investments.filter(inv => inv.type === filter);

  // Calculate Data for Donut Chart
  const getChartData = () => {
    const dataByTypes = investmentTypes.map(type => {
      return investments.filter(inv => inv.type === type).reduce((acc, inv) => acc + inv.amount, 0);
    });

    return {
      labels: investmentTypes,
      datasets: [
        {
          data: dataByTypes,
          backgroundColor: [
            '#00301e', // Aramco Primary 900
            '#03D47C', // Emerald Accent
            '#10B981', // Emerald 500
            '#34d399', // Emerald 400
            '#6ee7b7', // Emerald 300
            '#a7f3d0'  // Emerald 200
          ],
          borderWidth: 0,
          hoverOffset: 6
        },
      ],
    };
  };

  const chartOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        display: false // We will build a custom legend
      },
      tooltip: {
        backgroundColor: '#00301e',
        bodyFont: { family: 'Outfit, sans-serif' },
        callbacks: {
          label: (context) => ` ₹${context.raw.toLocaleString()}`
        }
      }
    }
  };


  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Portfolio Details</h1>
            <p className="mt-1 text-primary-600">Track and analyze your financial assets</p>
          </div>
          <button
            onClick={() => setIsFormVisible(!isFormVisible)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
          >
            {isFormVisible ? 'Close Form' : '+ New Investment'}
          </button>
        </div>

        {/* Form Modal/Section */}
        {isFormVisible && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-2xl shadow-sm border border-gray-100 animate-fade-in-up">
            <h3 className="text-xl font-bold text-primary-900 mb-6 border-b pb-2">Investment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Asset Name</label>
                <input type="text" name="name" value={newInvestment.name} onChange={handleChange} placeholder="e.g. SBI Fixed Deposit" className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Asset Class</label>
                <select name="type" value={newInvestment.type} onChange={handleChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-white">
                  {investmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Principal Amount</label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold">₹</span>
                  </div>
                  <input type="number" name="amount" value={newInvestment.amount} onChange={handleChange} placeholder="0.00" className="block w-full pl-8 border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date of Purchase</label>
                <input type="date" name="date" value={newInvestment.date} onChange={handleChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Additional Notes</label>
                <textarea name="notes" value={newInvestment.notes} onChange={handleChange} placeholder="Maturity date, interest rate, term length, etc." className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all" rows="2"></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="submit" className="px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-sm text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 transition-colors">
                Save Securely
              </button>
            </div>
          </form>
        )}

        {/* Global Dashboard Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
          {/* Total Value Tracker */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
$
            </div>
            <p className="text-sm font-bold text-primary-600 uppercase tracking-widest mb-2 z-10">Total Invested Value</p>
            <p className="text-4xl lg:text-5xl font-display font-black text-primary-900 z-10">
              ₹{totalInvested.toLocaleString()}
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 bg-accent-50 text-accent-700 text-xs font-bold rounded-full z-10">
              <span className="w-2 h-2 rounded-full bg-accent-500 mr-2 animate-pulse"></span>
              Live Tracking
            </div>
          </div>

          {/* Visual Portfolio Distribution Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-8">
            {investments.length > 0 ? (
                <>
                <div className="w-32 h-32 relative flex-shrink-0">
                    <Doughnut data={getChartData()} options={chartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Assets</span>
                        <span className="text-lg font-bold text-primary-900">{investments.length}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Portfolio Allocation</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6">
                        {getChartData().datasets[0].data.map((amount, idx) => (
                            amount > 0 && (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getChartData().datasets[0].backgroundColor[idx] }}></span>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{investmentTypes[idx]}</span>
                                        <span className="text-sm font-bold text-primary-900">₹{amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center w-full py-4 opacity-50 text-gray-500">
                    <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-sm font-bold">Chart will appear once investments are added</span>
                </div>
            )}
          </div>
        </div>

        {/* Quick Filters */}
        {investments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                <button 
                  onClick={() => setFilter('All')} 
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'All' ? 'bg-primary-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    All Assets
                </button>
                {investmentTypes.map((type) => {
                    // Only show filter badge if there are investments of this type
                    const count = investments.filter(inv => inv.type === type).length;
                    if (count === 0) return null;
                    return (
                        <button 
                          key={type}
                          onClick={() => setFilter(type)} 
                          className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === type ? 'bg-primary-900 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >
                            {type}
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${filter === type ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                        </button>
                    );
                })}
            </div>
        )}

        {/* Portfolio Assets Listing */}
        {investments.length === 0 ? (
          <div className="p-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Portfolio Empty</h3>
            <p className="mb-6">Start tracking your assets to unlock analytics and visualizing tools.</p>
          </div>
        ) : filteredInvestments.length === 0 ? (
            <div className="p-12 text-center text-gray-500 bg-white/50 rounded-2xl border border-gray-100 shadow-sm">
                <p>No investments found for {filter}.</p>
                <button onClick={() => setFilter('All')} className="mt-4 text-accent-600 font-bold hover:underline">Clear Filter</button>
            </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvestments.map((investment) => (
              <div key={investment._id} className="bg-gradient-to-br from-[#00301e] to-primary-800 p-6 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden border border-white/10">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#03D47C]/40 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out -z-10 blur-xl"></div>
                
                {editingInvestment && editingInvestment._id === investment._id ? (
                  <form onSubmit={handleUpdate} className="space-y-4 bg-white/5 p-4 rounded-xl shadow-inner backdrop-blur-sm">
                    <input type="text" name="name" value={editingInvestment.name} onChange={handleEditChange} className="block w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#03D47C] outline-none placeholder-white/60 transition-all" placeholder="Name" />
                    <select name="type" value={editingInvestment.type} onChange={handleEditChange} className="block w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#03D47C] outline-none appearance-none [&>option]:bg-[#00301e] [&>option]:text-white">
                      {investmentTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input type="number" name="amount" value={editingInvestment.amount} onChange={handleEditChange} className="block w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#03D47C] outline-none placeholder-white/60 transition-all" placeholder="Amount" />
                    <input type="date" name="date" value={editingInvestment.date.split('T')[0]} onChange={handleEditChange} className="block w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#03D47C] outline-none transition-all [&::-webkit-calendar-picker-indicator]:invert" />
                    <textarea name="notes" value={editingInvestment.notes} onChange={handleEditChange} className="block w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-[#03D47C] outline-none placeholder-white/60 transition-all resize-none" rows="2" placeholder="Notes (Optional)"></textarea>
                    
                    <div className="flex space-x-3 pt-3">
                      <button type="submit" className="bg-[#03D47C] hover:bg-emerald-400 transition-colors text-[#00301e] px-4 py-2.5 rounded-xl text-sm font-bold flex-1 shadow-lg shadow-[#03D47C]/20 hover:shadow-[#03D47C]/40 transform active:scale-95">Apply</button>
                      <button type="button" onClick={cancelEditing} className="bg-white/10 hover:bg-white/20 border-transparent text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors backdrop-blur-md">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-emerald-400 shadow-inner border border-white/10 transform group-hover:rotate-12 transition-transform duration-300">
                          {investment.type.includes('Gold') ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          ) : investment.type.includes('Stock') ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          ) : investment.type.includes('Fund') ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          ) : investment.type.includes('Deposit') ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#03D47C] uppercase tracking-widest bg-[#03D47C]/10 inline-block px-2 py-0.5 rounded-md mb-1">{investment.type}</p>
                            <h2 className="text-xl font-bold text-white line-clamp-1 group-hover:text-emerald-50 transition-colors">{investment.name}</h2>
                        </div>
                      </div>
                      
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button onClick={() => startEditing(investment)} className="p-2 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-all transform hover:scale-110" title="Edit">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(investment._id)} className="p-2 text-white/50 hover:text-red-400 rounded-xl hover:bg-red-400/10 transition-all transform hover:scale-110" title="Delete">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-5 relative">
                      <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Current Valuation</p>
                      <p className="text-3xl font-display font-black text-white tracking-tight flex items-baseline gap-1">
                        <span className="text-xl text-emerald-400 font-medium">₹</span>
                        {investment.amount.toLocaleString()}
                      </p>
                      
                      <div className="flex justify-between items-center mt-5 pt-4 border-t border-dashed border-white/10">
                        <div className="flex items-center text-xs text-white/60 font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                            <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {new Date(investment.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        {investment.notes && (
                          <div className="group/tooltip relative">
                            <div className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg cursor-help transition-colors border border-white/10">
                                <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-white text-[#00301e] text-xs leading-relaxed rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 shadow-2xl z-20 border border-gray-100 font-medium transform translate-y-2 group-hover/tooltip:translate-y-0 before:content-[''] before:absolute before:top-full before:right-3 before:border-4 before:border-t-white before:border-transparent">
                                {investment.notes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Investments;