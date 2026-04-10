/**
 * Mobile-friendly form feedback: keep error text in view and avoid focus() stealing the viewport
 * from the message next to the primary action.
 */
(function () {
  function scrollFeedbackIntoView(el) {
    if (!el) return;
    if (el.classList && el.classList.contains('hidden')) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
          try {
            el.scrollIntoView(true);
          } catch (e2) {
            /* ignore */
          }
        }
      });
    });
  }

  function focusFieldNoScroll(el) {
    if (!el || typeof el.focus !== 'function') return;
    try {
      el.focus({ preventScroll: true });
    } catch (e) {
      try {
        el.focus();
      } catch (e2) {
        /* ignore */
      }
    }
  }

  function setPrimaryButtonError(button, hasError) {
    if (!button || !button.classList) return;
    if (hasError) {
      button.classList.add('ring-2', 'ring-red-500', 'ring-offset-2');
      button.setAttribute('aria-invalid', 'true');
    } else {
      button.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2');
      button.removeAttribute('aria-invalid');
    }
  }

  if (typeof window !== 'undefined') {
    window.scrollFeedbackIntoView = scrollFeedbackIntoView;
    window.focusFieldNoScroll = focusFieldNoScroll;
    window.setPrimaryButtonError = setPrimaryButtonError;
  }
})();
