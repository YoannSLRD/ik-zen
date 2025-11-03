<!-- frontend/src/components/MonthlyChart.vue -->
<template>
    <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { Bar } from 'vue-chartjs';
  import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
  
  // C'est une étape obligatoire pour que Chart.js fonctionne dans Vue
  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);
  
  // On définit les "props" que ce composant attend de son parent
  const props = defineProps({
    chartRawData: {
      type: Object,
      required: true
    }
  });
  
  // On prépare les données et les options pour le graphique
  const chartData = ref(null);
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // On cache la légende, car il n'y a qu'une seule série de données
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Ajoute "km" après chaque valeur sur l'axe Y
          callback: function(value) {
            return value + ' km';
          }
        }
      }
    }
  };
  
  // onMounted est utilisé pour accéder aux styles CSS une fois le composant monté
  onMounted(() => {
    // On récupère les couleurs de notre marque depuis les variables CSS !
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--ikzen-primary').trim();
  
    chartData.value = {
      labels: props.chartRawData.labels,
      datasets: [
        {
          label: 'Distance (km)',
          backgroundColor: primaryColor,
          data: props.chartRawData.data
        }
      ]
    };
  });
  </script>