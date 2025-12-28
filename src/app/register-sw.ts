
'use client';

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        // Check for updates on page load
        registration.update();

        // Listen for the new service worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // A new SW has been installed.
                  // The old one is still in control. We can now reload the page to activate the new SW.
                  console.log('New service worker installed. Reloading page...');
                  window.location.reload();
                } else {
                  // This is the first time the SW is being installed.
                  console.log('Service worker installed for the first time.');
                }
              }
            };
          }
        };
      }).catch(error => {
        console.error('Service worker registration failed:', error);
      });
    });
  }
}
