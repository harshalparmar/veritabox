// Tiny QR renderer wrapper — uses qrcode.js from a CDN.
// Drop <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
// then call renderQR('#qr', 'https://...').
window.renderQR = function (selector, text, opts = {}) {
  const el = document.querySelector(selector);
  if (!el || !window.QRCode) return;
  window.QRCode.toCanvas(text, {
    width: opts.size || 120,
    margin: 0,
    color: { dark: opts.dark || '#000000', light: opts.light || '#ffffff00' },
    errorCorrectionLevel: 'M',
  }, (err, canvas) => {
    if (err) return console.error(err);
    el.innerHTML = '';
    el.appendChild(canvas);
  });
};

// Token substitution — replace {{name}} with data attributes on <body data-name="...">.
window.hydrateTokens = function () {
  const data = document.body.dataset;
  document.querySelectorAll('[data-token]').forEach(el => {
    const key = el.dataset.token;
    if (data[key] !== undefined) el.textContent = data[key];
  });
};
