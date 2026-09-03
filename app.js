(() => {
  const supportedVideoPattern = /\.(mp4|mkv|webm|mov|m4v|avi)$/i;
  const waitingMessageDelay = 15000;

  const setStatusTone = (element, tone) => {
    element.className = `status status--${tone}`;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const player = document.getElementById("player");
    const magnetInput = document.getElementById("magnet");
    const playBtn = document.getElementById("playBtn");
    const filePicker = document.getElementById("filePicker");
    const statusEl = document.getElementById("status");

    let client = null;
    let currentTorrent = null;
    let videoFiles = [];
    let waitingTimer = null;

    const setStatus = (text, tone = "info") => {
      setStatusTone(statusEl, tone);
      statusEl.textContent = text;
    };

    const clearWaitingTimer = () => {
      if (waitingTimer) {
        window.clearTimeout(waitingTimer);
        waitingTimer = null;
      }
    };

    const resetPicker = () => {
      filePicker.hidden = true;
      filePicker.innerHTML = "";
    };

    const resetPlayer = () => {
      player.pause();
      player.removeAttribute("src");
      player.load();
    };

    const renderFile = (file) => {
      resetPlayer();
      setStatus(`正在播放：${file.name}`, "info");
      file.renderTo(player, { autoplay: true }, (err) => {
        if (err) {
          setStatus(`播放失败：${err.message}`, "error");
        }
      });
    };

    const cleanup = () => {
      clearWaitingTimer();
      resetPicker();
      videoFiles = [];
      resetPlayer();

      if (!currentTorrent) {
        return;
      }

      currentTorrent.destroy();
      currentTorrent = null;
    };

    const validateMagnetLink = (value) => {
      try {
        const url = new URL(value);
        const xt = url.searchParams.get("xt") || "";
        return url.protocol === "magnet:" && /^urn:btih:[a-z0-9]+$/i.test(xt);
      } catch {
        return false;
      }
    };

    const disablePlayback = (message, tone = "warning") => {
      playBtn.disabled = true;
      setStatus(message, tone);
    };

    filePicker.addEventListener("change", (event) => {
      const index = Number(event.target.value);
      if (videoFiles[index]) {
        renderFile(videoFiles[index]);
      }
    });

    if (!window.WebTorrent) {
      disablePlayback("无法加载 WebTorrent 浏览器依赖，请检查网络、CDN 可用性或静态站点的外部脚本策略。", "error");
      return;
    }

    if (!window.WebTorrent.WEBRTC_SUPPORT) {
      disablePlayback("当前浏览器或网络环境不支持 WebRTC，纯前端模式下无法连接 BT peers。请改用支持 WebRTC 的现代桌面浏览器，或先用桌面 BT 客户端获取视频直链。");
      return;
    }

    try {
      client = new window.WebTorrent();
    } catch (err) {
      disablePlayback(`播放器初始化失败：${err.message}`, "error");
      return;
    }

    playBtn.addEventListener("click", () => {
      const magnet = magnetInput.value.trim();
      if (!validateMagnetLink(magnet)) {
        setStatus("请输入有效的 magnet link，例如 magnet:?xt=urn:btih:...", "error");
        return;
      }

      cleanup();
      setStatus("正在解析 magnet link，并等待支持 WebRTC 的 peers / trackers...", "info");
      waitingTimer = window.setTimeout(() => {
        setStatus("仍在等待支持 WebRTC 的 peers / trackers。如果长时间没有开始播放，请换一个带 WebRTC tracker 的种子，或改用桌面 BT 客户端。", "warning");
      }, waitingMessageDelay);

      const torrent = client.add(magnet, (resolvedTorrent) => {
        clearWaitingTimer();
        currentTorrent = resolvedTorrent;
        videoFiles = resolvedTorrent.files.filter((file) => supportedVideoPattern.test(file.name));

        if (!videoFiles.length) {
          setStatus("种子已加载，但未找到可播放的视频文件。", "warning");
          return;
        }

        if (videoFiles.length > 1) {
          videoFiles.forEach((file, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = file.name;
            filePicker.appendChild(option);
          });
          filePicker.hidden = false;
        }

        renderFile(videoFiles[0]);
      });

      currentTorrent = torrent;
      torrent.on("warning", (err) => {
        setStatus(`连接提示：${err.message}`, "warning");
      });
      torrent.on("error", (err) => {
        clearWaitingTimer();
        setStatus(`加载失败：${err.message}`, "error");
      });
    });

    client.on("error", (err) => {
      clearWaitingTimer();
      setStatus(`加载失败：${err.message}`, "error");
    });

    window.addEventListener("beforeunload", () => {
      cleanup();
      client.destroy();
    });
  });
})();
