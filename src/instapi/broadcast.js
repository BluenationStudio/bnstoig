const InstaError = require('./InstaError')
const instapi = require('./client')
const log = require('electron-log')

async function create(options) {
	log.info(`Creating broadcast ${JSON.stringify(options)}`)

	try {
		const apiClient = await instapi.getApiClient();
		const { previewWidth, previewHeight } = options || {}

		const { broadcast_id, upload_url } = await apiClient.live.create({
			previewWidth: previewWidth || 1080,
			previewHeight: previewHeight || 1920,
		});

		log.info(`Created stream with id: ${broadcast_id}`)

		// (optional) get the key and url for programs such as OBS
		const { stream_key, stream_url } = instapi.api.LiveEntity.getUrlAndKey({ broadcast_id, upload_url });
		log.info('RTMP and stream key loaded')

		return {
			rtmpUrl: stream_url,
			streamKey: stream_key,
			broadcastId: broadcast_id,
		}
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @param {boolean=} sendNotification
 * @return {Promise<{ status: string, media_id: string }>}
 */
async function start(broadcastId, sendNotification) {
	log.info(`Starting broadcast ${JSON.stringify({ broadcastId, sendNotification })}`)

	try {
		const apiClient = await instapi.getApiClient();

		/**
		 * make sure you are streaming to the url
		 * the next step will send a notification / start your stream for everyone to see
		 */
		const startInfo = await apiClient.live.start(broadcastId, sendNotification);

		log.info('Broadcast started');
		log.info(startInfo);

		/** now, stream is running */
		return startInfo
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @return {Promise<void>}
 */
async function stop(broadcastId) {
	log.info(`Stopping broadcast ${broadcastId}`)

	try {
		const apiClient = await instapi.getApiClient();
		await apiClient.live.endBroadcast(broadcastId);
	} catch (err) {
		throw new InstaError(err)
	}
}

module.exports = { create, start, stop }
