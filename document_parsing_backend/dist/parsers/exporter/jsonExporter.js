"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonExporter = void 0;
class JsonExporter {
    /**
     * Serializes ParsedDocument into a pretty-printed JSON string.
     */
    async export(doc) {
        return JSON.stringify(doc, null, 2);
    }
}
exports.JsonExporter = JsonExporter;
exports.default = JsonExporter;
