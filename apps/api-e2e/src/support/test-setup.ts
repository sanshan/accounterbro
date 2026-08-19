import axios from 'axios';

import { getApiE2eRuntimeConfig } from './runtime-config';

module.exports = async function () {
    const { baseUrl } = getApiE2eRuntimeConfig();

    axios.defaults.baseURL = baseUrl;
};
