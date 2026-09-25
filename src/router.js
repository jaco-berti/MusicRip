import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './views/home.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
  ],
})
