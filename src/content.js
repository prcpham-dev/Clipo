const pipButtons = new Map();

function injectButtons() {
  const isYouTube = window.location.hostname.includes('youtube.com');
  const isWatchPage = window.location.pathname.includes('/watch');

  if (isYouTube && !isWatchPage) return;

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.readyState === 0 || video.offsetWidth < 100 || video.offsetHeight < 100) {
      return;
    }

    if (!pipButtons.has(video)) {
      const btn = document.createElement('button');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="13" y="13" width="8" height="8" rx="1" ry="1"></rect></svg>`;
      btn.title = 'Watch in Picture-in-Picture';

      btn.style.cssText = `
        position: absolute;
        padding: 0.5em;
        cursor: pointer;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        color: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        transition: all 0.25s ease;
        display: none;
        pointer-events: auto;
      `;

      btn.addEventListener('mouseover', () => {
        btn.style.background = 'rgba(0, 0, 0, 0.7)';
        btn.style.transform = 'scale(1.1)';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.background = 'rgba(0, 0, 0, 0.4)';
        btn.style.transform = 'scale(1)';
      });

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (document.pictureInPictureElement === video) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } catch (err) {
          console.error('[Clipo] Error toggling PiP:', err);
        }
      });

      const showBtn = () => { btn.style.display = 'block'; };
      const hideBtn = () => { btn.style.display = 'none'; };

      video.addEventListener('mouseenter', showBtn);
      video.addEventListener('mouseleave', hideBtn);
      btn.addEventListener('mouseenter', showBtn);
      btn.addEventListener('mouseleave', hideBtn);

      // Auto-play next video if it finishes in PiP on YouTube
      video.addEventListener('ended', () => {
        if (document.pictureInPictureElement === video && isYouTube) {
          const nextBtn = document.querySelector('.ytp-next-button');
          if (nextBtn) nextBtn.click();
        }
      });

      document.body.appendChild(btn);
      pipButtons.set(video, btn);
    }

    // Position: always top-right
    const btn = pipButtons.get(video);
    if (btn && btn.style.display !== 'none') {
      const rect = video.getBoundingClientRect();
      btn.style.top = `${window.scrollY + rect.top + 8}px`;
      btn.style.left = `${window.scrollX + rect.right - btn.offsetWidth - 8}px`;
    }
  });
}

setInterval(injectButtons, 500);
