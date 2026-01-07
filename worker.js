export default {
  async fetch(request) {
    try {
      const u = new URL(request.url);
      const path = u.pathname;
      const igUrl = u.searchParams.get("url");

      if (!igUrl || !igUrl.includes("instagram.com")) {
        return json({ error: true, message: "Invalid Instagram URL" });
      }

      // Instagram internal JSON (same as your working APIs)
      const apiUrl = igUrl.split("?")[0] + "?__a=1&__d=dis";

      const res = await fetch(apiUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "accept": "application/json"
        }
      });

      if (!res.ok) throw new Error("Instagram request blocked");

      const data = await res.json();
      const media = data.items?.[0];
      if (!media) throw new Error("Media not found");

      const caption = media.caption?.text || "Instagram Media";

      // =====================================================
      // /insta-dl  → Direct video info
      // =====================================================
      if (path === "/insta-dl") {
        if (!media.video_versions) {
          return json({ error: true, message: "Video not found" });
        }

        const v = media.video_versions[0];
        const d = Math.floor(media.video_duration || 0);

        // Try to detect real file size
        const sizeInfo = await getFileSize(v.url);

        let result = {
          duration:
            String(Math.floor(d / 60)).padStart(2, "0") +
            ":" +
            String(d % 60).padStart(2, "0"),
          quality: `${v.width}x${v.height}p`,
          extension: "mp4",
          url: v.url
        };

        if (sizeInfo) {
          result.size = sizeInfo.bytes;
          result.formattedSize = sizeInfo.formatted;
        }

        return json({
          error: false,
          result,
          join: "@ProBotXUpdate",
          support: "@ProBotUpdate"
        });
      }

      // =====================================================
      // /social-dl → Images + Videos
      // =====================================================
      if (path === "/social-dl") {
        let images = [];
        let videos = [];

        if (media.image_versions2) {
          images.push({
            url: media.image_versions2.candidates[0].url,
            type: "jpg",
            quality: "HD",
            mute: "yes"
          });
        }

        if (media.video_versions) {
          const v = media.video_versions[0];
          const sizeInfo = await getFileSize(v.url);

          let videoObj = {
            url: v.url,
            type: "mp4",
            quality: "HD",
            mute: "no"
          };

          if (sizeInfo) {
            videoObj.size = sizeInfo.formatted;
          }

          videos.push(videoObj);
        }

        return json({
          error: false,
          title: caption,
          images,
          videos,
          join: "@ProBotXUpdate",
          support: "@ProBotUpdate"
        });
      }

      return json({ error: true, message: "Invalid API path" });

    } catch (e) {
      return json({ error: true, message: e.message });
    }
  }
};

// --------------------------------------------------
// Try to get real file size using HEAD request
// --------------------------------------------------
async function getFileSize(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const len = r.headers.get("content-length");
    if (len) {
      const kb = (Number(len) / 1024).toFixed(2);
      return {
        bytes: Number(len),
        formatted: kb + " KB"
      };
    }
  } catch (e) {
    // silently fail
  }
  return null;
}

function json(data) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json" }
  });
        }
