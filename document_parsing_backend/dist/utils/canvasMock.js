"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const module_1 = __importDefault(require("module"));
// Intercept require calls for 'canvas' module to avoid native compilation errors on Windows/Linux
const originalRequire = module_1.default.prototype.require;
module_1.default.prototype.require = function (...args) {
    const id = args[0];
    if (id === 'canvas') {
        class DOMMatrix {
            a = 1;
            b = 0;
            c = 0;
            d = 1;
            e = 0;
            f = 0;
        }
        class CanvasRenderingContext2D {
        }
        class Canvas {
        }
        class Image {
        }
        return {
            DOMMatrix,
            CanvasRenderingContext2D,
            Canvas,
            Image,
        };
    }
    return originalRequire.apply(this, args);
};
