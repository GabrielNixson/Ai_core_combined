"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectPLC = connectPLC;
exports.startPolling = startPolling;
exports.getCachedLiveData = getCachedLiveData;
const modbus_serial_1 = __importDefault(require("modbus-serial"));
const plc_config_1 = require("../config/plc.config");
const registerParser_1 = require("../utils/registerParser");
const influx_service_1 = require("./influx.service");
const client = new modbus_serial_1.default();
let connected = false;
let cachedData = {};
let pollingStarted = false;
async function connectPLC() {
    if (!connected) {
        await client.connectTCP(plc_config_1.PLC_CONFIG.host, {
            port: plc_config_1.PLC_CONFIG.port
        });
        client.setID(plc_config_1.PLC_CONFIG.unitId);
        connected = true;
        console.log("PLC Connected");
    }
}
async function pollPLC() {
    try {
        await connectPLC();
        const response = await client.readHoldingRegisters(10, 6);
        console.log('response: ', response);
        cachedData = (0, registerParser_1.parseEnergyRegisters)(response.data);
        console.log('cachedData: ', cachedData);
        // if (cachedData && Object.keys(cachedData).length > 0) {
        //   writePLCData(cachedData);
        // }
        (0, influx_service_1.writePLCData)(cachedData);
    }
    catch (error) {
        // console.error("PLC Read Error:", error);
        connected = false;
    }
}
function startPolling() {
    if (!pollingStarted) {
        setInterval(pollPLC, plc_config_1.PLC_CONFIG.pollIntervalMs);
        pollingStarted = true;
        // console.log("PLC polling started");
    }
}
function getCachedLiveData() {
    return cachedData;
}
//# sourceMappingURL=plc.service.js.map