import { environment } from 'src/environments/environment';

const backendBase = environment.apiUrl.replace('/api', '');

let mediaCacheBust = Date.now();

export function bustMediaCache() {
  mediaCacheBust = Date.now();
}

export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${backendBase}${url}${separator}_cb=${mediaCacheBust}`;
}

export { getMediaUrl as getAvatarUrl };
