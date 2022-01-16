const settings = require('electron-settings')
const version = require('../package.json').version

function getSettings() {
    const savedSettings = settings.getAll()[version]
    if (!savedSettings || Object.keys(savedSettings).length < 2) {
        clearInstallState()
    }
    return settings.getAll()[version]
}

// used when application is crashed 
// and all dependencies need to be reinstalled
function clearInstallState() {
	settings.setAll({
		[version]: { installed: false, failedOnVCRedist: false }
	})
}

// installation of dependencies was successfull
function setInstalledState() {
	const savedSettings = getSettings()
	settings.setAll({
		[version]: Object.assign(savedSettings, { installed: true})
	})
}

// used when 
function setFailedOnVCRedist() {
	settings.setAll({
		[version]: { installed: false, failedOnVCRedist: true }
	})
}

module.exports = { getSettings, clearInstallState, setInstalledState, setFailedOnVCRedist }
