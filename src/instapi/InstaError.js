module.exports = class InstaError extends Error {
    constructor(base) {
        super();
        this.message = base.text || base.message || base.toString();
        this.code = base.constructor.name
    }
}
