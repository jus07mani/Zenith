(function () {
  window.ZenithUtils = {
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    lerp(start, end, amount) {
      return start + (end - start) * amount;
    },

    formatNumber(value, decimals = 4) {
      return Number(value).toFixed(decimals);
    },

    randomRange(min, max) {
      return min + Math.random() * (max - min);
    }
  };
})();
