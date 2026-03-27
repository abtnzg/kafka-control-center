import React from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Enregistrement obligatoire
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

export default function LiveChart({ data }) {
  return (
    <Line
      data={{
        labels: data.map((_, i) => i),
        datasets: [
          {
            label: "Lag",
            data,
            borderColor: "#6366f1",
            tension: 0.3,
          },
        ],
      }}
      options={{
        responsive: true,
        scales: {
          x: { display: false },
          y: { ticks: { color: "#e2e8f0" } },
        },
      }}
    />
  );
}