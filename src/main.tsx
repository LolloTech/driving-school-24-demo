import { appBase } from './paths';
// The public animation bundle is never imported on an office URL.
if (/^\/(login|register|backoffice)(\/|$)/.test(window.location.pathname.slice(appBase.length))) {
  import('./modules/backoffice/main');
} else {
  import('./publicEntry');
}
