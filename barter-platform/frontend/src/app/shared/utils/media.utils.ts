import { environment } from 'src/environments/environment';

const backendBase = environment.apiUrl.replace('/api', '');

export function getMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${backendBase}${url}`;
}

export { getMediaUrl as getAvatarUrl };
