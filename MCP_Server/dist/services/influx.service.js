"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writePLCData = writePLCData;
exports.queryAnalysisData = queryAnalysisData;
const influxdb_client_1 = require("@influxdata/influxdb-client");
const url = "http://localhost:8086";
const token = "XFtTFWHTP17FFRp6i2CQYF1TED5emPWus6x8sz37P7TNyDHzBjQNQQVgmz0Fd0kBm2mR-mF_MVSMFJkKcGMDzA==";
const org = "hexrfactory";
const bucket = "mcp";
const influxDB = new influxdb_client_1.InfluxDB({ url, token });
const writeApi = influxDB.getWriteApi(org, bucket);
function writePLCData(data) {
    const point = new influxdb_client_1.Point("plc_data")
        .floatField("voltage", data.voltage)
        .floatField("current", data.current)
        .floatField("power", data.power);
    writeApi.writePoint(point);
    // console.log('point: ', point);
}
const queryApi = influxDB.getQueryApi(org);
async function queryAnalysisData(options) {
    const { range, field, aggregation, limit } = options;
    const normalizedRange = range.startsWith("-") ? range : `-${range}`;
    let fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${normalizedRange})
      |> filter(fn: (r) => r._measurement == "plc_data")
  `;
    if (field) {
        fluxQuery += `
      |> filter(fn: (r) => r._field == "${field}")
    `;
    }
    if (!aggregation) {
        // RAW MODE
        fluxQuery += `
    |> sort(columns: ["_time"])
  `;
        if (limit) {
            fluxQuery += `
      |> limit(n: ${limit})
    `;
        }
    }
    else {
        // AGGREGATION MODE
        fluxQuery += `
    |> ${aggregation}()
  `;
    }
    // console.log("Flux Query:\n", fluxQuery);
    const rows = await queryApi.collectRows(fluxQuery);
    return rows;
}
//# sourceMappingURL=influx.service.js.map