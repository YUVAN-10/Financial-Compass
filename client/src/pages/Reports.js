import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import DataVisualization from '../components/DataVisualization';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [yearlyComparison, setYearlyComparison] = useState([]);
  const [dailyTrend, setDailyTrend] = useState([]); // New daily trend state

  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const getExportData = () => {
    let data;
    let headers;

    if (activeTab === 'monthly') {
      headers = ['Month', 'Income', 'Expenses', 'Balance', 'Transactions'];
      data = monthlyTrend.map(item => ({
        Month: monthNames[(item?.month || 0) - 1],
        Income: item?.totalIncome || 0,
        Expenses: item?.totalExpense || 0,
        Balance: item?.balance || 0,
        Transactions: item?.transactionCount || 0,
      }));
    } else if (activeTab === 'daily') { // Daily export logic
      headers = ['Date', 'Income', 'Expenses', 'Balance', 'Transactions'];
      data = dailyTrend.map(item => ({
        Date: item.date,
        Income: item.totalIncome || 0,
        Expenses: item.totalExpense || 0,
        Balance: item.balance || 0,
        Transactions: item.transactionCount || 0
      }));
    } else if (activeTab === 'category') {
      headers = ['Category', 'Amount', 'Percentage'];
      data = categorySummary.map(item => ({
        Category: item.name,
        Amount: item.totalAmount,
        Percentage: item.percentage.toFixed(1) + '%',
      }));
    } else if (activeTab === 'yearly') {
      headers = ['Year', 'Month', 'Income', 'Expenses', 'Balance'];
      const currentYearRows = yearlyComparison.currentYear.map((item, index) => ({
        Year: selectedYear,
        Month: monthNames[index],
        Income: item?.totalIncome || 0,
        Expenses: item?.totalExpense || 0,
        Balance: item?.balance || 0,
        Transactions: item?.transactionCount || 0,
      }));
      const prevYearRows = yearlyComparison.prevYear.map((item, index) => ({
        Year: selectedYear - 1,
        Month: monthNames[index],
        Income: item?.totalIncome || 0,
        Expenses: item?.totalExpense || 0,
        Balance: item?.balance || 0,
        Transactions: item?.transactionCount || 0,
      }));
      data = [...currentYearRows, ...prevYearRows];
    } else if (activeTab === 'visualization') {
      headers = ['Metric', 'Value'];
      const totalIncome = monthlyTrend.reduce((sum, item) => sum + (item?.totalIncome || 0), 0);
      const totalExpenses = monthlyTrend.reduce((sum, item) => sum + (item?.totalExpense || 0), 0);
      const score = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

      data = [
        { Metric: 'Financial Health Score', Value: score.toFixed(2) + '%' },
        { Metric: 'Total Income', Value: totalIncome.toFixed(2) },
        { Metric: 'Total Expenses', Value: totalExpenses.toFixed(2) },
        ...monthlyTrend.map(item => ({
          Metric: `Cash Flow - ${monthNames[(item?.month || 0) - 1]}`,
          Value: item.balance.toFixed(2)
        }))
      ];
    }

    return { headers, data };
  };

  const downloadCSV = () => {
    const { headers, data } = getExportData();

    if (!data || data.length === 0) {
      alert('No data to download.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `report_${activeTab}_${selectedYear}.csv`);
  };

  const downloadExcel = () => {
    const { headers, data } = getExportData();

    if (!data || data.length === 0) {
      alert('No data to download.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    const cols = headers.map(header => ({ wch: Math.max(header.length, ...data.map(row => String(row[header]).length)) + 2 }));
    worksheet['!cols'] = cols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

    saveAs(blob, `report_${activeTab}_${selectedYear}.xlsx`);
  };

  // Years for filter dropdown (current year and 2 previous years)
  const years = [
    selectedYear,
    selectedYear - 1,
    selectedYear - 2
  ];

  // Month names for labels
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch daily trend data
  const fetchDailyTrend = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportService.getDailyTrend(selectedYear, selectedMonth);
      console.log('Daily trend response:', response);
      if (response && response.success) {
        setDailyTrend(response.data);
      } else {
        setDailyTrend([]);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching daily trend:', err);
      setDailyTrend([]);
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch monthly trend data for the selected year
  const fetchMonthlyTrend = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await reportService.getMonthlyTrend(selectedYear);
      console.log('Monthly trend response:', response);

      // Handle different response structures
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

      console.log('Processed monthly data:', monthlyData);
      setMonthlyTrend(monthlyData);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching monthly trend:', err);
      setMonthlyTrend([]);
      setError(null);
      setLoading(false);
    }
  }, [selectedYear]);

  // Fetch category summary for the selected month and year
  const fetchCategorySummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await reportService.getCategorySummary(selectedYear, selectedMonth);
      console.log('Category summary response:', response);

      // Handle different response structures
      let categories = [];
      if (response && response.success && response.data) {
        categories = response.data.categories || response.data || [];
      } else if (response && response.categories) {
        categories = response.categories;
      } else if (response && Array.isArray(response)) {
        categories = response;
      }

      // Add percentage calculation for pie chart
      if (categories && categories.length > 0) {
        const total = categories.reduce((sum, category) => sum + (category.totalAmount || category.total || 0), 0);
        const categoriesWithPercentage = categories.map(category => ({
          ...category,
          totalAmount: category.totalAmount || category.total || 0,
          percentage: total > 0 ? ((category.totalAmount || category.total || 0) / total) * 100 : 0
        }));
        setCategorySummary(categoriesWithPercentage);
      } else {
        setCategorySummary([]);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching category summary:', err);
      setCategorySummary([]);
      setError(null);
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch yearly comparison data
  const fetchYearlyComparison = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data for current year and previous year
      const currentYearData = await reportService.getMonthlyTrend(selectedYear);
      const prevYearData = await reportService.getMonthlyTrend(selectedYear - 1);

      console.log('Yearly comparison - current year:', currentYearData);
      console.log('Yearly comparison - previous year:', prevYearData);

      // Handle different response structures
      const currentYearMonthlyData = currentYearData.data?.monthlyData || currentYearData.monthlyData || [];
      const prevYearMonthlyData = prevYearData.data?.monthlyData || prevYearData.monthlyData || [];

      setYearlyComparison({
        currentYear: currentYearMonthlyData,
        prevYear: prevYearMonthlyData
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching yearly comparison:', err);
      setError('Failed to load yearly comparison data. Please check your connection and try again.');
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    // Load data based on active tab
    if (activeTab === 'monthly') {
      fetchMonthlyTrend();
    } else if (activeTab === 'category') {
      fetchCategorySummary();
    } else if (activeTab === 'yearly') {
      fetchYearlyComparison();
    } else if (activeTab === 'daily') { // Fetch daily
      fetchDailyTrend();
    }
  }, [activeTab, selectedYear, selectedMonth, fetchMonthlyTrend, fetchCategorySummary, fetchYearlyComparison, fetchDailyTrend]);

  // Monthly trend chart data with validation
  const monthlyTrendData = {
    labels: monthNames,
    datasets: [
      {
        label: 'Income',
        data: Array.isArray(monthlyTrend) ? monthlyTrend.map(item => item?.totalIncome || 0) : Array(12).fill(0),
        borderColor: '#03D47C', // Emerald Green (Aramco Accent)
        backgroundColor: 'rgba(3, 212, 124, 0.1)',
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#03D47C',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Expenses',
        data: Array.isArray(monthlyTrend) ? monthlyTrend.map(item => item?.totalExpense || 0) : Array(12).fill(0),
        borderColor: '#EF4444', // Red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#EF4444',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Balance',
        data: Array.isArray(monthlyTrend) ? monthlyTrend.map(item => item?.balance || 0) : Array(12).fill(0),
        borderColor: '#00301e', // Primary-900 (Aramco Deep Green)
        backgroundColor: 'rgba(0, 48, 30, 0.05)',
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#00301e',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: [5, 5]
      }
    ]
  };

  // Category summary chart data with validation
  const categorySummaryData = {
    labels: Array.isArray(categorySummary) && categorySummary.length > 0
      ? categorySummary.map(category => category.name || 'Unknown Category')
      : ['No Data'],
    datasets: [
      {
        data: Array.isArray(categorySummary) && categorySummary.length > 0
          ? categorySummary.map(category => category.totalAmount || 0)
          : [0],
        backgroundColor: Array.isArray(categorySummary) && categorySummary.length > 0
          ? categorySummary.map(category => category.color || '#03D47C')
          : ['#F3F4F6'],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 4
      }
    ]
  };

  // Yearly comparison chart data with validation
  const yearlyComparisonData = {
    labels: monthNames,
    datasets: [
      {
        label: `Income ${selectedYear}`,
        data: Array.isArray(yearlyComparison.currentYear)
          ? yearlyComparison.currentYear.map(item => item?.totalIncome || 0)
          : Array(12).fill(0),
        backgroundColor: '#03D47C',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: `Income ${selectedYear - 1}`,
        data: Array.isArray(yearlyComparison.prevYear)
          ? yearlyComparison.prevYear.map(item => item?.totalIncome || 0)
          : Array(12).fill(0),
        backgroundColor: 'rgba(3, 212, 124, 0.3)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: `Expenses ${selectedYear}`,
        data: Array.isArray(yearlyComparison.currentYear)
          ? yearlyComparison.currentYear.map(item => item?.totalExpense || 0)
          : Array(12).fill(0),
        backgroundColor: '#EF4444',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      },
      {
        label: `Expenses ${selectedYear - 1}`,
        data: Array.isArray(yearlyComparison.prevYear)
          ? yearlyComparison.prevYear.map(item => item?.totalExpense || 0)
          : Array(12).fill(0),
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }
    ]
  };

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          font: {
            family: 'Outfit, sans-serif',
            size: 12,
            weight: 500
          },
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
          color: '#4B5563'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: '#00301e',
        titleFont: {
          family: 'Outfit, sans-serif',
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: 'Outfit, sans-serif',
          size: 12
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Outfit, sans-serif',
            size: 11
          }
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          borderDash: [5, 5]
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Outfit, sans-serif',
            size: 11
          },
          callback: function (value) {
            return '₹' + value.toLocaleString();
          }
        },
        border: {
          display: false
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            family: 'Outfit, sans-serif',
            size: 12
          },
          padding: 20,
          usePointStyle: true,
          color: '#4B5563'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: '#00301e',
        bodyFont: {
          family: 'Outfit, sans-serif'
        },
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += '₹' + context.parsed.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    cutout: '75%'
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          font: {
            family: 'Outfit, sans-serif',
            size: 12
          },
          usePointStyle: true,
          boxWidth: 8,
          color: '#4B5563'
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: '#00301e',
        titleFont: {
          family: 'Outfit, sans-serif'
        },
        bodyFont: {
          family: 'Outfit, sans-serif'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Outfit, sans-serif',
            size: 11
          }
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
          borderDash: [5, 5]
        },
        ticks: {
          color: '#6B7280',
          font: {
            family: 'Outfit, sans-serif',
            size: 11
          },
          callback: function (value) {
            return '₹' + value.toLocaleString();
          }
        },
        border: {
          display: false
        }
      }
    }
  };

  return (
    <div className="bg-cream min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Financial Analytics</h1>
            <p className="mt-1 text-primary-600">
              Comprehensive financial reports and visualizations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <span className="mr-2">📄</span> CSV
            </button>
            <button
              onClick={downloadExcel}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
            >
              <span className="mr-2">📊</span> Excel
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 p-1">
          <div className="flex flex-wrap gap-1 p-1 bg-gray-50/50 rounded-xl">
            {[
              { id: 'monthly', label: 'Monthly Trends' },
              { id: 'daily', label: 'Day by Day' },
              { id: 'category', label: 'Category Breakdown' },
              { id: 'yearly', label: 'Yearly Comparison' },
              { id: 'visualization', label: 'Data Visualization' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 px-4 text-center font-bold text-sm rounded-lg transition-all ${activeTab === tab.id
                  ? 'bg-white text-primary-900 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="min-w-[200px]">
              <label htmlFor="year" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Fiscal Year
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm font-medium bg-gray-50 hover:bg-white transition-colors"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {activeTab === 'category' && (
              <div className="min-w-[200px]">
                <label htmlFor="month" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Period
                </label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm font-medium bg-gray-50 hover:bg-white transition-colors"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'daily' && (
              <div className="min-w-[200px]">
                <label htmlFor="month-daily" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Select Month
                </label>
                <select
                  id="month-daily"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-sm font-medium bg-gray-50 hover:bg-white transition-colors"
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-96 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500"></div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Analyzing financial data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
            {activeTab === 'visualization' && <DataVisualization monthlyTrend={monthlyTrend} />}

            {/* Monthly Trend Chart */}
            {activeTab === 'monthly' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-primary-900">Monthly Performance</h2>
                  <div className="text-sm text-gray-500">Year: <span className="font-bold text-primary-900">{selectedYear}</span></div>
                </div>
                <div className="h-[400px] mb-8 w-full">
                  <Line data={monthlyTrendData} options={lineChartOptions} />
                </div>

                {/* Summary Table */}
                <div className="overflow-x-auto">
                  {Array.isArray(monthlyTrend) && monthlyTrend.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-l-xl">Month</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Income</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expenses</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-r-xl">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {monthlyTrend.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-900">
                              {monthNames[(item?.month || index + 1) - 1]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                              ₹{(item?.totalIncome || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">
                              ₹{(item?.totalExpense || 0).toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${(item?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ₹{(item?.balance || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item?.transactionCount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-16">
                      <div className="mx-auto h-12 w-12 text-gray-300 mb-3">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">No Data Available</h3>
                      <p className="text-gray-500">No financial records found for {selectedYear}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Daily Trend Chart */}
            {activeTab === 'daily' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display font-bold text-primary-900">Daily Performance</h2>
                  <div className="text-sm text-gray-500">{monthNames[selectedMonth - 1]} <span className="font-bold text-primary-900">{selectedYear}</span></div>
                </div>
                <div className="h-[400px] mb-8 w-full">
                  <Line
                    data={{
                      labels: dailyTrend.map(item => item.day),
                      datasets: [
                        {
                          label: 'Income',
                          data: dailyTrend.map(item => item.totalIncome),
                          borderColor: '#03D47C',
                          backgroundColor: 'rgba(3, 212, 124, 0.1)',
                          tension: 0.3,
                          borderWidth: 2,
                          pointBackgroundColor: '#fff',
                          pointBorderColor: '#03D47C'
                        },
                        {
                          label: 'Expenses',
                          data: dailyTrend.map(item => item.totalExpense),
                          borderColor: '#EF4444',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          tension: 0.3,
                          borderWidth: 2,
                          pointBackgroundColor: '#fff',
                          pointBorderColor: '#EF4444'
                        },
                      ]
                    }}
                    options={{
                      ...lineChartOptions,
                      plugins: {
                        ...lineChartOptions.plugins,
                        title: {
                          display: false
                        }
                      }
                    }}
                  />
                </div>

                {/* Daily Summary Table */}
                <div className="overflow-x-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-200">
                  {Array.isArray(dailyTrend) && dailyTrend.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-l-xl">Date</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Income</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Expenses</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider rounded-r-xl">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {dailyTrend.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-900">
                              {item.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                              ₹{(item?.totalIncome || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-500">
                              ₹{(item?.totalExpense || 0).toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${(item?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              ₹{(item?.balance || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item?.transactionCount || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-16">
                      <h3 className="text-lg font-medium text-gray-900">No Daily Data</h3>
                      <p className="text-gray-500">No transactions recorded for {monthNames[selectedMonth - 1]} {selectedYear}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category Breakdown Chart */}
            {activeTab === 'category' && (
              <div className="p-6">
                <h2 className="text-xl font-display font-bold text-primary-900 mb-6">Expense Allocation</h2>

                {categorySummary.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="h-[350px] relative">
                      <Doughnut data={categorySummaryData} options={pieChartOptions} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-bold text-primary-900">
                          ₹{categorySummary.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                      <table className="min-w-full divide-y divide-[#ECEFF1]">
                        <thead className="bg-[#F5F7FA]">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#607D8B] uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#607D8B] uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#607D8B] uppercase tracking-wider">Percentage</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#ECEFF1]">
                          {categorySummary.map((category, index) => (
                            <tr key={index} className="hover:bg-[#ECEFF1]/30">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: category.color || '#D4AF37' }}></div>
                                  <span className="text-sm font-medium text-[#0B1F3A]">{category.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0B1F3A]">₹{category.totalAmount.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0B1F3A]">{category.percentage.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#607D8B]">
                    No expense data available for {monthNames[selectedMonth - 1]} {selectedYear}.
                  </div>
                )}
              </div>
            )}

            {/* Yearly Comparison Chart */}
            {activeTab === 'yearly' && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-[#0B1F3A] mb-6">Year-over-Year Analysis</h2>
                <div className="h-[400px] mb-8">
                  <Bar data={yearlyComparisonData} options={barChartOptions} />
                </div>

                {/* Summary Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#F5F7FA] rounded-lg p-6 border border-[#ECEFF1]">
                    <h3 className="text-lg font-medium text-[#0B1F3A] mb-4">{selectedYear} Summary</h3>
                    {yearlyComparison.currentYear && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-[#607D8B]">Total Income</p>
                          <p className="text-xl font-semibold text-[#2ECC71]">
                            ₹{yearlyComparison.currentYear.reduce((sum, item) => sum + (item?.totalIncome || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#607D8B]">Total Expenses</p>
                          <p className="text-xl font-semibold text-[#EB5757]">
                            ₹{yearlyComparison.currentYear.reduce((sum, item) => sum + (item?.totalExpense || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#607D8B]">Net Balance</p>
                          <p className={`text-xl font-semibold ${yearlyComparison.currentYear.reduce((sum, item) => sum + (item?.balance || 0), 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#EB5757]'}`}>
                            ₹{yearlyComparison.currentYear.reduce((sum, item) => sum + (item?.balance || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#F5F7FA] rounded-lg p-6 border border-[#ECEFF1]">
                    <h3 className="text-lg font-medium text-[#0B1F3A] mb-4">{selectedYear - 1} Summary</h3>
                    {yearlyComparison.prevYear && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-[#607D8B]">Total Income</p>
                          <p className="text-xl font-semibold text-[#2ECC71]">
                            ₹{yearlyComparison.prevYear.reduce((sum, item) => sum + (item?.totalIncome || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#607D8B]">Total Expenses</p>
                          <p className="text-xl font-semibold text-[#EB5757]">
                            ₹{yearlyComparison.prevYear.reduce((sum, item) => sum + (item?.totalExpense || 0), 0).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#607D8B]">Net Balance</p>
                          <p className={`text-xl font-semibold ${yearlyComparison.prevYear.reduce((sum, item) => sum + (item?.balance || 0), 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#EB5757]'}`}>
                            ₹{yearlyComparison.prevYear.reduce((sum, item) => sum + (item?.balance || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
};

export default Reports;