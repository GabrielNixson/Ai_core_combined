import { InfluxDB, Point } from "@influxdata/influxdb-client";

const url = "http://localhost:8086";
const token = "XFtTFWHTP17FFRp6i2CQYF1TED5emPWus6x8sz37P7TNyDHzBjQNQQVgmz0Fd0kBm2mR-mF_MVSMFJkKcGMDzA==";
const org = "hexrfactory";
const bucket = "mcp";

const influxDB = new InfluxDB({ url, token });
const writeApi = influxDB.getWriteApi(org, bucket);

export function writePLCData(data: {
  voltage: number;
  current: number;
  power: number;
}) {
  const point = new Point("plc_data")
    .floatField("voltage", data.voltage)
    .floatField("current", data.current)
    .floatField("power", data.power);

  writeApi.writePoint(point);
  // console.log('point: ', point);
}

const queryApi = influxDB.getQueryApi(org);

export async function queryAnalysisData(options: {
  range: string;
  field?: string;
  aggregation?: "mean" | "sum" | "min" | "max" | "raw";
  limit?: number;
}) {
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
  } else {
    // AGGREGATION MODE
    fluxQuery += `
    |> ${aggregation}()
  `;
  }

  // console.log("Flux Query:\n", fluxQuery);

  const rows = await queryApi.collectRows(fluxQuery);

  return rows;
}