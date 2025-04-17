import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const COLORS = [
  'rgba(255, 99, 132, 0.7)',
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(75, 192, 192, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
];

interface ChartProps {
  data: any;
}

const Chart: React.FC<ChartProps> = ({ data }) => {
  // Assign colors to each dataset
  const datasets = data.datasets.map((dataset: any, index: number) => {
    const color = COLORS[index % COLORS.length] || 'rgba(0, 0, 0, 0.7)';
    return {
      ...dataset,
      backgroundColor: color,
      borderColor: color.replace('0.7', '1'),
      borderWidth: 1,
    };
  });

  // Configure chart options (white text, semi-transparent grid lines)
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff', // Legend text color
        },
      },
      title: {
        display: true,
        text: 'Stats Chart',
        color: '#fff', // Title text color
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#fff', // X-axis label color
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)', // X-axis grid line color
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#fff', // Y-axis label color
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)', // Y-axis grid line color
        },
      },
    },
  };

  return <Bar data={{ ...data, datasets }} options={options} />;
};

export default Chart;
