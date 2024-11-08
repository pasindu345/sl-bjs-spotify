const axios = require('axios');

const client_id = '414df719f85e45c9bd0ee5e83d08b501';
const client_secret = 'fa7e159a0b904b8b8505bf59b6458d3a';

const getAccessToken = async () => {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const authOptions = {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: 'grant_type=client_credentials'
  };
  const response = await axios.post(tokenUrl, authOptions.data, { headers: authOptions.headers });
  return response.data.access_token;
};

const searchSongs = async (accessToken, query, limit = 30, offset = 0) => {
  const searchUrl = 'https://api.spotify.com/v1/search';
  const options = {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    params: {
      q: query,
      type: 'track',
      limit,
      offset
    }
  };
  const response = await axios.get(searchUrl, options);
  return response.data;
};

const getAlbumDetails = async (accessToken, albumUrl) => {
  const albumId = albumUrl.split('/').pop().split('?')[0];
  const albumDetailsUrl = `https://api.spotify.com/v1/albums/${albumId}`;
  const response = await axios.get(albumDetailsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const albumInfo = response.data;
  const tracks = albumInfo.tracks.items.map((track, index) => ({
    trackNumber: index + 1,
    trackName: track.name,
    artist: track.artists.map(artist => artist.name).join(', '),
    durationMs: track.duration_ms,
    previewUrl: track.preview_url,
    spotifyUrl: track.external_urls.spotify
  }));
  return {
    albumName: albumInfo.name,
    artist: albumInfo.artists.map(artist => artist.name).join(', '),
    releaseDate: albumInfo.release_date,
    imageUrl: albumInfo.images[0].url,
    totalTracks: albumInfo.total_tracks,
    tracks
  };
};

const getPlaylistDetails = async (accessToken, playlistUrl) => {
  const playlistId = playlistUrl.split('/').pop().split('?')[0];
  const playlistDetailsUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;
  const response = await axios.get(playlistDetailsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  const playlistInfo = response.data;
  const tracks = playlistInfo.tracks.items.map((item, index) => ({
    trackNumber: index + 1,
    trackName: item.track.name,
    artist: item.track.artists.map(artist => artist.name).join(', '),
    album: item.track.album.name,
    durationMs: item.track.duration_ms,
    previewUrl: item.track.preview_url,
    spotifyUrl: item.track.external_urls.spotify
  }));
  return {
    playlistName: playlistInfo.name,
    description: playlistInfo.description,
    owner: playlistInfo.owner.display_name,
    imageUrl: playlistInfo.images[0].url,
    totalTracks: playlistInfo.tracks.total,
    tracks
  };
};

module.exports = async (req, res) => {
  const query = req.query.q;
  const spotifyUrl = req.query.url;
  const limit = parseInt(req.query.limit, 10) || 30;
  const offset = parseInt(req.query.offset, 10) || 0;
  const isAlbum = req.query.album === 'true';
  const isPlaylist = req.query.playlist === 'true';
  const bot = req.query.bot;

  try {
    const accessToken = await getAccessToken();
    if (spotifyUrl && isPlaylist) {
      const playlistDetails = await getPlaylistDetails(accessToken, spotifyUrl);
      return res.status(200).json({ data: playlistDetails, developerCredit: 'https://t.me/Teleservices_Api' });
    } else if (spotifyUrl && isAlbum) {
      const albumDetails = await getAlbumDetails(accessToken, spotifyUrl);
      return res.status(200).json({ tracks: albumDetails.tracks, developerCredit: 'https://t.me/Teleservices_Api' });
    } else if (spotifyUrl) {
      const trackDetails = await searchSongs(accessToken, spotifyUrl, 1, 0);
      const trackInfo = trackDetails.tracks.items[0];
      if (trackInfo) {
        return res.status(200).json({
          track: {
            trackName: trackInfo.name,
            artist: trackInfo.artists.map(artist => artist.name).join(', '),
            album: trackInfo.album.name,
            releaseDate: trackInfo.album.release_date,
            durationMs: trackInfo.duration_ms,
            previewUrl: trackInfo.preview_url,
            spotifyUrl: trackInfo.external_urls.spotify
          },
          developerCredit: 'https://t.me/Teleservices_Api'
        });
      } else {
        return res.status(404).json({ error: 'Track not found' });
      }
    } else if (query) {
      let tracks = [];
      const firstBatch = await searchSongs(accessToken, query, Math.min(limit, 100), offset);
      tracks = tracks.concat(firstBatch.tracks.items);
      if (limit > 100 && firstBatch.tracks.items.length === 100) {
        const secondBatch = await searchSongs(accessToken, query, Math.min(limit - 100, 100), offset + 100);
        tracks = tracks.concat(secondBatch.tracks.items);
      }
      if (tracks.length > 0) {
        const trackDetailsList = tracks.map((track, index) => {
          const previewUrl = track.preview_url || 'No preview available';
          const image = track.album.images.length > 0 ? track.album.images[0].url : 'No image available';
          return {
            id: index + 1,
            trackName: track.name,
            artist: track.artists.map(artist => artist.name).join(', '),
            album: track.album.name,
            releaseDate: track.album.release_date,
            spotifyUrl: track.external_urls.spotify,
            previewUrl,
            image
          };
        });
        return res.status(200).json({ tracks: trackDetailsList, developerCredit: 'https://t.me/Teleservices_Api' });
      } else {
        return res.status(404).json({ error: 'No tracks found' });
      }
    } else if (bot) {
      const trackDetails = await searchSongs(accessToken, bot, 1, 0);
      const trackInfo = trackDetails.tracks.items[0];
      if (trackInfo) {
        const duration_ms = trackInfo.duration_ms;
        const d = Math.floor(duration_ms / 1000);
        return res.status(200).json({
          track: {
            trackName: trackInfo.name,
            artist: trackInfo.artists.map(artist => artist.name).join(', '),
            image: trackInfo.album.images[0].url,
            durationMs: d,
            spotifyUrl: trackInfo.external_urls.spotify
          }
        });
      } else {
        return res.status(404).json({ error: 'Track not found' });
      }
    } else {
      res.status(500).json({ error: 'use the api functions' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
