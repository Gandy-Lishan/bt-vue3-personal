/**
 * ChartIQ-compatible axios instance.
 *
 * In the original Vue2 project, src/main.ts assigned the customized axios
 * instance (src/axios.js) to CIQ.axios. That instance added basic auth
 * credentials to every request via a request interceptor.
 *
 * This file recreates the same axios behavior for the Vue3 project so that
 * ChartIQ's quote feed and extension files can use CIQ.axios without
 * modification.
 */

import axios from 'axios'

const chartiqAxios = axios.create({
  baseURL: '',
})

chartiqAxios.interceptors.request.use((config) => {
  config.auth = {
    username: 'sentimentrader_backtest_api',
    password: 'TAZcbpTmQVAJW4GW3ZMQA1su0ynjqJJsYo6vfkapx',
  }
  return config
})

export default chartiqAxios
