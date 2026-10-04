// The public animation bundle is never imported on an office URL.
if (/^\/(login|register|backoffice)(\/|$)/.test(window.location.pathname)) {
  import('./modules/backoffice/main');
} else {
  import('./publicEntry');
}
