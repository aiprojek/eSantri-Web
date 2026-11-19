// Prevent Dexie dual-version conflict when cached chunks or HMR re-evaluates
(function() {
  try {
    var sym = Symbol.for("Dexie");
    Object.defineProperty(window, sym, {
      configurable: true,
      enumerable: false,
      get: function() { return undefined; },
      set: function() {}
    });
  } catch (e) {}
})();
