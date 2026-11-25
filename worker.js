import page from './audio-test.html';
import album from './api/album.js';
import albums from './api/albums.js';
import artist from './api/artist.js';
import artists from './api/artists.js';
import home from './api/home.js';
import latest from './api/new.js';
import playlist from './api/playlist.js';
import playlists from './api/playlists.js';
import related from './api/related.js';
import song from './api/song.js';
import songs from './api/songs.js';

const routes = new Map(Object.entries({ album, albums, artist, artists, home, new: latest, playlist, playlists, related, song, songs }));

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/audio-test.html') {
      return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (url.pathname === '/') return Response.json({ status: 'active', name: 'JioSaavn API', repo: 'ODSkyler/jiosaavn-api' });
    const route = url.pathname.match(/^\/api\/([a-z]+)\/?$/)?.[1];
    const handler = routes.get(route);
    if (!handler) return Response.json({ message: 'Not found' }, { status: 404 });

    let status = 200;
    const headers = new Headers({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return new Response(null, { status: 405, headers });
    const res = {
      setHeader: (key, value) => headers.set(key, value),
      status(code) { status = code; return this; },
      json: (body) => Response.json(body, { status, headers }),
      end: () => new Response(null, { status, headers }),
    };
    try {
      const query = Object.fromEntries(url.searchParams);
      if (route === 'songs' && Object.hasOwn(query, 'link')) {
        let link;
        try { link = new URL(query.link); } catch { /* handled below */ }
        const token = link?.pathname.match(/^\/song\/[^/]+\/([\w-]+)\/?$/)?.[1];
        if (link?.protocol !== 'https:' || !['www.jiosaavn.com', 'jiosaavn.com'].includes(link.hostname) || !token) {
          return res.status(400).json({ message: 'Expected a JioSaavn song permalink' });
        }
        return await song({ method: request.method, query: { token } }, res);
      }
      return await handler({ method: request.method, query }, res);
    } catch {
      return Response.json({ message: 'Upstream request failed' }, { status: 502, headers });
    }
  },
};
