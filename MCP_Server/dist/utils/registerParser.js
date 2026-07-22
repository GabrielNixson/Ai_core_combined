"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registersToFloat = registersToFloat;
exports.parseEnergyRegisters = parseEnergyRegisters;
function registersToFloat(high, low) {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt16BE(high, 0);
    buffer.writeUInt16BE(low, 2);
    return buffer.readFloatBE(0);
}
function parseEnergyRegisters(registers) {
    if (registers.length < 6) {
        throw new Error(`Insufficient registers received. Expected 6, got ${registers.length}`);
    }
    return {
        voltage: registersToFloat(registers[0], registers[1]).toFixed(2),
        current: registersToFloat(registers[2], registers[3]).toFixed(2),
        power: registersToFloat(registers[4], registers[5]).toFixed(2)
    };
}
//# sourceMappingURL=registerParser.js.map