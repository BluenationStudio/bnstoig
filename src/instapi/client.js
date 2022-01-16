// const { setInstaState, getInstaState } = require('../settings')
const uuid = require('uuid')
let instagramPrivateApi = null;
let _apiClient = null;

function initialize() {
    if (instagramPrivateApi) { return }
    instagramPrivateApi = require('instagram-private-api');
}

function clear() {
    _apiClient = null
}

/**
 * @param {(string | null)=} username
 * @param {(boolean | undefined)=} remember
 * @return {Promise<IgApiClient>}
 */
async function getApiClient(username = null, remember = undefined) {
    initialize();

    if (!_apiClient) {
        _apiClient = new instagramPrivateApi.IgApiClient()
        _apiClient.state.generateDevice(username || uuid.v4());
        // _apiClient.state.proxyUrl = process.env.IG_PROXY;

        // _apiClient.request.end$.subscribe(async () => {
        //     const instaState = getInstaState()
        //     if (!instaState || !instaState.remember) { return }
        //     console.log(JSON.stringify(instaState))
        //
        //     const serialized = await _apiClient.state.serialize();
        //     delete serialized.constants; // this deletes the version info, so you'll always use the version provided by the library
        //     setInstaState({ remember, serialized })
        // });

        // if (remember) {
        //     const instaState = getInstaState()
        //     console.log(JSON.stringify(instaState))
        //     if (instaState && instaState.serialized) {
        //         try {
        //             await _apiClient.state.deserialize(instaState.serialized);
        //             stateRecovered = true;
        //         } catch (err) {
        //             console.log(err.toString())
        //         }
        //     }
        // }
    } else if (remember !== undefined) {
        const instaState = getInstaState()
        if (instaState.remember !== remember) {
            setInstaState({ remember })
        }
    }
    return _apiClient
}

module.exports = {
    get api() { return instagramPrivateApi || {} },
    getApiClient,
    initialize,
    clear,
}
