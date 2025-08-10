import axios from 'axios';

export async function tiktokDownloader(url) {
  const { data } = await axios.get(`https://api.ryzendesu.vip/api/downloader/tiktok?url=${encodeURIComponent(url)}`);
  return data;
}

export async function youtubePlay(query) {
  const { data } = await axios.get(`https://api.ryzendesu.vip/api/downloader/youtube/play?query=${encodeURIComponent(query)}`);
  return data;
}
