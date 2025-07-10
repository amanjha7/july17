const { BaseService } = require("../base/baseservice");

class PronnelOauthService extends BaseService {
    static instance;
    name = this.constructor.name;

    constructor() {
        super(PronnelOauthService.name);
    }

    static getInstance() {
        if (!PronnelOauthService.instance) {
            PronnelOauthService.instance = new PronnelOauthService();
        }
        return PronnelOauthService.instance;
    }
}

module.exports = { PronnelOauthService };
