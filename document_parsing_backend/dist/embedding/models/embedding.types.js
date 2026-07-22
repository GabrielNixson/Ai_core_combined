"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkEmbeddingStatus = void 0;
var ChunkEmbeddingStatus;
(function (ChunkEmbeddingStatus) {
    ChunkEmbeddingStatus["PENDING"] = "PENDING";
    ChunkEmbeddingStatus["PROCESSING"] = "PROCESSING";
    ChunkEmbeddingStatus["COMPLETED"] = "COMPLETED";
    ChunkEmbeddingStatus["FAILED"] = "FAILED";
    ChunkEmbeddingStatus["RETRYING"] = "RETRYING";
})(ChunkEmbeddingStatus || (exports.ChunkEmbeddingStatus = ChunkEmbeddingStatus = {}));
