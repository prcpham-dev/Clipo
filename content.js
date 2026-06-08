const pipButtons = new Map();

function injectButtons() {
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

        if (window.location.hostname.includes('youtube.com')) {
          const isMainVideo = video.classList.contains('html5-main-video');
          if (!isMainVideo) {
            let link = null;
            const container = video.closest('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-rich-grid-media, ytd-thumbnail');
            if (container) {
              link = container.querySelector('a#thumbnail, a.yt-simple-endpoint[href^="/watch"]');
            }
            if (!link) link = video.closest('a');

            if (link) {
              // Try multiple click strategies to wake up YouTube's router
              link.click();
              link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              
              // Fallback: If YouTube ignores the click, force navigate
              setTimeout(() => {
                if (!window.location.href.includes(link.href)) {
                  window.location.href = link.href;
                }
              }, 300);

              // Attempt to PiP the main video once it loads
              for (let i = 0; i < 50; i++) {
                await new Promise(r => setTimeout(r, 100));
                const mainVideo = document.querySelector('video.html5-main-video');
                if (mainVideo && mainVideo.readyState >= 2) {
                  try {
                    await mainVideo.requestPictureInPicture();
                    break;
                  } catch (err) {
                    // Ignore, might need more time or user gesture restriction
                  }
                }
              }
              return;
            } else {
               console.error('[PiP Extension] Could not find video link to navigate to.');
            }
          }
        }

        try {
          if (document.pictureInPictureElement === video) {
            await document.exitPictureInPicture();
          } else {
            await video.requestPictureInPicture();
          }
        } catch (err) {
          console.error('[PiP Extension] Error toggling PiP:', err);
        }
      });

      // Hover logic
      const showBtn = () => { btn.style.display = 'block'; };
      const hideBtn = () => { btn.style.display = 'none'; };

      video.addEventListener('mouseenter', showBtn);
      video.addEventListener('mouseleave', hideBtn);
      btn.addEventListener('mouseenter', showBtn);
      btn.addEventListener('mouseleave', hideBtn);

      // Auto-play next video if it finishes in PiP
      video.addEventListener('ended', () => {
        if (document.pictureInPictureElement === video && window.location.hostname.includes('youtube.com')) {
          const nextBtn = document.querySelector('.ytp-next-button');
          if (nextBtn) nextBtn.click();
        }
      });

      document.body.appendChild(btn);
      pipButtons.set(video, btn);
    }

    const btn = pipButtons.get(video);
    if (btn && btn.style.display !== 'none') {
      const rect = video.getBoundingClientRect();
      
      let position = 'top-right';
      if (window.location.hostname.includes('youtube.com') && !window.location.pathname.includes('/watch')) {
        position = 'bottom-left';
      }

      if (position === 'bottom-left') {
        btn.style.top = `${window.scrollY + rect.bottom - btn.offsetHeight - 8}px`;
        btn.style.left = `${window.scrollX + rect.left + 8}px`;
      } else {
        btn.style.top = `${window.scrollY + rect.top + 8}px`;
        btn.style.left = `${window.scrollX + rect.right - btn.offsetWidth - 8}px`;
      }
    }
  });
}

setInterval(injectButtons, 500);
