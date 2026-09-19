import React from 'react';
import { Line } from 'react-chartjs-2';

const CashFlowAnalysis = ({ data }) => {
  console.log('CashFlowAnalysis data:', data);
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        type: 'line',
        label: 'Cash Flow',
        data: data.map(d => d.balance),
        borderColor: '#0B1F3A',
        backgroundColor: 'rgba(11, 31, 58, 0.1)',
        tension: 0.1,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Income',
        data: data.map(d => d.totalIncome),
        borderColor: '#2ECC71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        tension: 0.1,
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        type: 'line',
        label: 'Expenses',
        data: data.map(d => d.totalExpense),
        borderColor: '#EB5757',
        backgroundColor: 'rgba(235, 87, 87, 0.1)',
        tension: 0.1,
        borderWidth: 2,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cash Flow Analysis',
        font: {
          size: 15,
          weight: '600',
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Amount',
        },
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold text-[#0B1F3A] mb-4">Cash Flow Analysis</h2>
      <div className="h-[400px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default CashFlowAnalysis;