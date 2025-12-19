import { createApp } from 'vue';
import App from './App.vue';
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';
import Home from '@/views/Home.vue';
import MonthlyReport from '@/views/MonthlyReport.vue';
import { createPinia } from 'pinia';

import VChart from 'vue-echarts';
// import '../src/style.css';

const routes = [
	{ path: '/', name: 'Home', component: Home },
	{ path: '/dashboard', name: 'Dashboard', component: Dashboard },
	{ path: '/monthly-report', name: 'MonthlyReport', component: MonthlyReport }
];
const router = createRouter({ history: createWebHistory(), routes });

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.component('v-chart', VChart);
app.use(router);
app.mount('#app');