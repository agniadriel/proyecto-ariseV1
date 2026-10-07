
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url =
    (event.notification && event.notification.data && event.notification.data.url) ||
    '/dashboard';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Si la app ya está abierta en alguna ventana, simplemente la enfocamos.
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Sin ventanas abiertas: abrimos la app en la ruta de la notificación.
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })()
  );
});

self.addEventListener('notificationclose', () => {
  // Gancho para analítica futura de recordatorios descartados.
});
