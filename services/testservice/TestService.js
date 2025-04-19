const { BaseService } = require("../base/baseservice");

class TestService extends BaseService {
    static instance;
    name = this.constructor.name;

    constructor() {
        super(TestService.name);
    }

    static getInstance() {
        if (!TestService.instance) {
            TestService.instance = new TestService();
        }
        return TestService.instance;
    }
}

module.exports = { TestService };
