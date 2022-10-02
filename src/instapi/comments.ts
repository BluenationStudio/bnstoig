import InstaError from './InstaError';
import instapi from './client';
import log from 'electron-log';

/**
 * @param {string} broadcastId
 * @param {string} message
 * @return {Promise<void>}
 */
async function create(broadcastId: any, message: any) {
	try {
		const apiClient = await instapi.getApiClient();
		await apiClient.live.comment(broadcastId, message)
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @return {Promise<void>}
 */
async function mute(broadcastId: any) {
	try {
		const apiClient = await instapi.getApiClient();
		await apiClient.live.muteComment(broadcastId)
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @return {Promise<void>}
 */
async function unmute(broadcastId: any) {
	try {
		const apiClient = await instapi.getApiClient();
		await apiClient.live.unmuteComment(broadcastId)
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @param {number=} lastCommentTs
 * @param {number=} commentsRequested
 * @return {Promise<{
 *     comments: {
 *         created_at: number
 *         user_id: string
 *         text: string
 *         type: number
 *         user: {
 *             username: string
 *             full_name: string
 *             is_verified: string
 *             profile_pic_url: string
 *         }
 *     }[]
 * }>}
 */
async function getComments(broadcastId: any, lastCommentTs: number, commentsRequested?: undefined) {
	try {
		const apiClient = await instapi.getApiClient();
		return await apiClient.live.getComment({
			broadcastId,
			lastCommentTs: lastCommentTs || 0,
			commentsRequested: commentsRequested || 100,
		})
	} catch (err) {
		throw new InstaError(err)
	}
}

/**
 * @param {string} broadcastId
 * @param {Function} onComments
 * @return {Promise<number>}
 */
async function readComments(broadcastId: any, onComments: (arg0: any) => void) {
	let lastCommentTs = 0
	return setInterval(async () => {
		try {
			const { comments } = await getComments(broadcastId, lastCommentTs)
			log.info(`Received ${comments.length} comments`)
			if (comments.length === 0) { return }
			lastCommentTs = Date.now()
			onComments(comments)
		} catch (err) {
			log.error(err)
		}
	}, 2500)
}

export default { create, getComments, readComments, mute, unmute }
