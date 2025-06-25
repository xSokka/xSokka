// ==== CONFIGURATION ====
  const YT_API_KEY   = 'AIzaSyB5m1XXHtHbt_MOwgG3vIxvbuQz_-osGiw'; // Replace with your YouTube Data API v3 key
  const OPENAI_KEY   = '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';                 // Replace with your OpenAI key
  const OPENAI_MODEL = 'gpt-3.5-turbo';                            // You can switch to gpt-4o if available

  // ==== HELPERS ====
  const $ = (sel) => document.querySelector(sel);

  function getVideoId(url) {
    const regex = /(?:youtube\.com\/(?:.*v=|v\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async function getVideoInfo() {
    const link = $('#youtubeLink').value.trim();
    const videoId = getVideoId(link);
    if (!videoId) return alert('Invalid YouTube link!');

    try {
      // --- 1. Fetch video details ---
      const videoDataUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YT_API_KEY}`;
      const videoData    = await fetchJSON(videoDataUrl);
      if (!videoData.items.length) return alert('Video not found!');
      const video        = videoData.items[0];
      const { title, description, channelId, publishedAt, thumbnails } = video.snippet;
      const { viewCount, likeCount, commentCount } = video.statistics;

      // --- 2. Fetch channel details ---
      const channelUrl   = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_API_KEY}`;
      const channelData  = await fetchJSON(channelUrl);
      const channel      = channelData.items[0];
      const channelTitle = channel.snippet.title;
      const channelThumb = channel.snippet.thumbnails.default.url;
      const subscriberCount = channel.statistics.subscriberCount;

      // --- 3. Get AI-generated summary ---
      const aiSummary = await getAISummary(title, description);

      // --- 4. Render to DOM ---
      $('#result').innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>

        <div class="video-meta">
          <h3>${title}</h3>
          <p><strong>Published:</strong> ${new Date(publishedAt).toLocaleDateString()}</p>
          <p><strong>Views:</strong> ${Number(viewCount || 0).toLocaleString()} | <strong>Likes:</strong> ${Number(likeCount || 0).toLocaleString()} | <strong>Comments:</strong> ${Number(commentCount || 0).toLocaleString()}</p>
        </div>

        <div class="channel-meta">
          <img src="${channelThumb}" alt="${channelTitle} logo">
          <div>
            <h4>${channelTitle}</h4>
            <p>${Number(subscriberCount || 0).toLocaleString()} subscribers</p>
          </div>
        </div>

        <div class="ai-summary">
          <h4>AI-Generated Overview</h4>
          <p>${aiSummary}</p>
        </div>`;

    } catch (err) {
      console.error(err);
      alert('Failed to fetch data. Check console for details.');
    }
  }

  async function getAISummary(title, description) {
    if (!OPENAI_KEY || OPENAI_KEY === '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') {
      return '⚠️ Add your OpenAI API key to enable AI summaries.';
    }

    const prompt = `Give a concise but engaging 3-5 sentence overview of the following YouTube video. Focus on what viewers will learn or experience.\n\nTitle: "${title}"\nDescription: "${description}"`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content?.trim();
      return aiText || 'No AI summary available.';
    } catch (e) {
      console.warn('OpenAI error', e);
      return 'AI summary unavailable (error contacting OpenAI).';
    }
  }