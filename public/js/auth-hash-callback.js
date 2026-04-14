/**
 * Runs after Supabase UMD: exchanges hash fragment session for app JWT.
 * Deferred so it does not block first paint.
 */
(function () {
  var hash = window.location.hash;
  if (!hash || hash.indexOf('access_token') === -1) return;
  (async function () {
    function readServerPublicConfig() {
      var el = document.getElementById('server-public-config');
      if (!el || !el.textContent) return null;
      try {
        return JSON.parse(el.textContent);
      } catch (e) {
        return null;
      }
    }
    try {
      var config = readServerPublicConfig();
      if (!config || !config.supabaseUrl || !config.supabaseAnonKey) return;
      var supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      if (typeof supabase.auth.initialize === 'function') await supabase.auth.initialize();
      var session = (await supabase.auth.getSession()).data.session;
      if (!session || !session.access_token) return;
      var tokenRes = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token })
      });
      var data = await tokenRes.json();
      if (tokenRes.ok && data.token) {
        localStorage.setItem('token', data.token);
        history.replaceState(null, '', window.location.pathname + window.location.search);
        window.location.reload();
      }
    } catch (e) {
      /* ignore */
    }
  })();
})();
