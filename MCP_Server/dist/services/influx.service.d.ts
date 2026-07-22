export declare function writePLCData(data: {
    voltage: number;
    current: number;
    power: number;
}): void;
export declare function queryAnalysisData(options: {
    range: string;
    field?: string;
    aggregation?: "mean" | "sum" | "min" | "max" | "raw";
    limit?: number;
}): Promise<unknown[]>;
//# sourceMappingURL=influx.service.d.ts.map