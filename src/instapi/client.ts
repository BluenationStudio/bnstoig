import uuid from 'uuid';
import { IgApiClient } from 'instagram-private-api';
let _apiClient = new IgApiClient();

/**
 * @param {(string | null)=} username
 * @return {Promise<IgApiClient>}
 */
async function getApiClient(username = null) {
    _apiClient = new IgApiClient()
    _apiClient?.state.generateDevice(username || uuid.v4());
}

export default {
    get api() { return IgApiClient || {} },
    getApiClient,
}
