/** Set html.auth / html.anon from localStorage before paint to reduce CLS from late nav toggles. */
(function () {
  try {
    document.documentElement.classList.add(localStorage.getItem('token') ? 'auth' : 'anon');
  } catch (e) {
    try {
      document.documentElement.classList.add('anon');
    } catch (err) {}
  }
})();
