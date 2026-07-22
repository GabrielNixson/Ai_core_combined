import Module from 'module';

// Intercept require calls for 'canvas' module to avoid native compilation errors on Windows/Linux
const originalRequire = Module.prototype.require;

(Module.prototype as any).require = function (this: any, ...args: any[]) {
  const id = args[0];
  if (id === 'canvas') {
    class DOMMatrix {
      public a = 1;
      public b = 0;
      public c = 0;
      public d = 1;
      public e = 0;
      public f = 0;
    }

    class CanvasRenderingContext2D {}
    class Canvas {}
    class Image {}

    return {
      DOMMatrix,
      CanvasRenderingContext2D,
      Canvas,
      Image,
    };
  }

  return originalRequire.apply(this, args as any);
};
