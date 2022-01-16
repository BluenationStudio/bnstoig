const InstaError = require('./InstaError')
const instapi = require('./client')

/**
 * @param {string} username
 * @param {string} password
 * @param {{
 *  onTwoFA({ type: 'SMS' | 'TOTP' }): Promise<{ code: string }>
 *  onCheckpoint({ url: string }): Promise<{ code: string }>
 *  remember: boolean
 * }} options
 * @return {Promise<{
 *  username: string
 *  full_name: string
 *  page_name: string
 *  profile_pic_url: string
 *  phone_number: string
 * }>}
 */
async function login(username, password, options) {
    instapi.clear()
    const apiClient = await instapi.getApiClient(username, options.remember);
    try {
        return await apiClient.account.login(username, password)
    } catch (error) {
        const {
            IgLoginTwoFactorRequiredError,
            IgCheckpointError,
        } = instapi.api
        if (error instanceof IgLoginTwoFactorRequiredError) {
            const {username, totp_two_factor_on, two_factor_identifier} = err.response.body.two_factor_info;
            // decide which method to use
            const verificationMethod = totp_two_factor_on ? '0' : '1'; // default to 1 for SMS
            // At this point a code should have been sent
            // Get the code
            const { code } = await options.onTwoFA({
                type: verificationMethod === '1' ? 'SMS' : 'TOTP'
            });
            // Use the code to finish the login process
            try {
                return await apiClient.account.twoFactorLogin({
                    username,
                    verificationCode: code,
                    twoFactorIdentifier: two_factor_identifier,
                    trustThisDevice: '1',
                    verificationMethod, // '1' = SMS (default), '0' = TOTP (google auth for example)
                });
            } catch (err) {
                throw new InstaError(err)
            }
        } else if (error instanceof IgCheckpointError) {
            await apiClient.challenge.auto(true); // Requesting sms-code or click "It was me" button
            const { code } = await options.onCheckpoint({ url: error.url });
            try {
                await apiClient.challenge.sendSecurityCode(code)
            } catch (err) {
                throw new InstaError(err)
            }
        } else {
            throw new InstaError(error)
        }
    }
}

module.exports = { login }
