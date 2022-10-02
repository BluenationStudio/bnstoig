export default class InstaError extends Error {
    [x: string]: any;
    constructor(base: any) {
        super();
        this.message = base.text || base.message || base.toString();
        this.code = base.constructor.name
    }
}
