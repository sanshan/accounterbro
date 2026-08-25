import axios from 'axios';

import { getDocumentsServiceE2eRuntimeConfig } from './runtime-config';

module.exports = async function () {
    const { baseUrl } = getDocumentsServiceE2eRuntimeConfig();

    axios.defaults.baseURL = baseUrl;
};
