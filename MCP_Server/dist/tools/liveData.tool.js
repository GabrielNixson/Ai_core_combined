"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveDataHandler = exports.liveDataSchema = void 0;
const plc_service_1 = require("../services/plc.service");
exports.liveDataSchema = {};
const liveDataHandler = async () => {
    const data = (0, plc_service_1.getCachedLiveData)();
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2)
            }
        ],
        structuredContent: data
    };
};
exports.liveDataHandler = liveDataHandler;
//# sourceMappingURL=liveData.tool.js.map