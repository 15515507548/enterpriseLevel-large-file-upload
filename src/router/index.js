import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  base: process.env.BASE_URL,
  routes: [
    // {
    //   path: '/',
    //   redirect: '/about'
    // },
    {
      path: '/',
      name: 'about',
      component: () => import('../views/myAbout.vue')
    },
    {
      path: '*',
      redirect: '/'
    }
  ]
})
