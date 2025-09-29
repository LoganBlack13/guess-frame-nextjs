/**
 * Utilitaires pour gérer les dates de manière cohérente entre serveur et client
 * Évite les problèmes d'hydratation en utilisant toujours la même locale
 */

export function formatTime(timestamp: number): string {
  if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatJoinedTime(timestamp: number): string {
  return formatTime(timestamp);
}
