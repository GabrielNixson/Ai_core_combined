import ModbusRTU from "modbus-serial";
import { PLC_CONFIG } from "../config/plc.config";
import { parseEnergyRegisters } from "../utils/registerParser";
import { writePLCData } from "./influx.service";

const client = new ModbusRTU();

let connected = false;
let cachedData: any = {};
let pollingStarted = false;

export async function connectPLC() {
  if (!connected) {
    await client.connectTCP(PLC_CONFIG.host, {
      port: PLC_CONFIG.port
    });

    client.setID(PLC_CONFIG.unitId);
    connected = true;
    console.log("PLC Connected");
  }
}

async function pollPLC() {
  try {
    await connectPLC();

    const response = await client.readHoldingRegisters(10, 6);
    console.log('response: ', response);
    cachedData = parseEnergyRegisters(response.data);
    console.log('cachedData: ', cachedData);

    // if (cachedData && Object.keys(cachedData).length > 0) {
    //   writePLCData(cachedData);
    // }

    writePLCData(cachedData);

  } catch (error) {
    // console.error("PLC Read Error:", error);
    connected = false;
  }
}

export function startPolling() {
  if (!pollingStarted) {
    setInterval(pollPLC, PLC_CONFIG.pollIntervalMs);
    pollingStarted = true;
    // console.log("PLC polling started");
  }
}

export function getCachedLiveData() {
  return cachedData;
}
