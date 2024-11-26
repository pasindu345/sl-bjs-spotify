const express = require('express');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 3000;

// Function to get Spotify track details
const getSpotifyTrackDetails = async (url) => {
  try {
    const response = await axios.get(`https://api.fabdl.com/spotify/get?url=${url}`);
    return response.data.result;
  } catch (error) {
    throw new Error('Error fetching Spotify track details');
  }
};

// Function to get the download link
const getDownloadLink = async (gid, track_id) => {
  try {
    const response = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${gid}/${track_id}`);
    return response.data.result;
  } catch (error) {
    throw new Error('Error fetching download link');
  }
};

// Function to get track metadata
const getTrackMetadata = async (trackId) => {
  try {
    const response = await axios.get(`https://api.spotifydown.com/metadata/track/${trackId}`, {
      headers: {
        'sec-ch-ua-platform': '"Android"',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
        'accept': '*/*',
        'origin': 'https://spotifydown.com',
        'referer': 'https://spotifydown.com/',
        'accept-language': 'en-US,en;q=0.9',
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching track metadata');
  }
};

// Route to download Spotify track
app.get('/spotify/down', async (req, res) => {
  const spotifyUrl = req.query.url;

  if (!spotifyUrl) {
    return res.status(400).json({ status: false, message: 'Spotify URL is required' });
  }

  try {
    // Fetch track details from the first API
    const trackDetails = await getSpotifyTrackDetails(spotifyUrl);
    const { gid, id, name, image, artists, duration_ms } = trackDetails;

    // Fetch download link
    const downloadTask = await getDownloadLink(gid, id);

    if (!downloadTask.download_url) {
      return res.status(500).json({ status: false, message: 'Failed to retrieve download link' });
    }

    // Fetch track metadata from the second API
    const trackMetadata = await getTrackMetadata(id);
    if (!trackMetadata.success) {
      return res.status(500).json({ status: false, message: 'Failed to retrieve track metadata' });
    }

    const finalResult = {
      status: true,
      id,
      title: name,
      image: image,
      artist: artists,
      duration: new Date(duration_ms).toISOString().substr(14, 5),
      duration_ms,
      download_link: `https://api.fabdl.com${downloadTask.download_url}`,
      album: trackMetadata.album,
      cover: trackMetadata.cover,
      isrc: trackMetadata.isrc,
      releaseDate: trackMetadata.releaseDate,
      spotify_url: `https://open.spotify.com/track/${id}`
    };

    res.json(finalResult);
  } catch (error) {
    res.status(500).json({ status: false, message: error.message || 'An error occurred' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
