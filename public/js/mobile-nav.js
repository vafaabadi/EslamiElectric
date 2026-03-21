(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('header-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', function () {
    nav.classList.toggle('mobile-open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('mobile-open'));
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 640) nav.classList.remove('mobile-open');
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('mobile-open'); });
  });
})();
