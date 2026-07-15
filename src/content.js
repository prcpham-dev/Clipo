const pipButtons = new Map();

function injectButtons() {
  const isYouTube = window.location.hostname.includes('youtube.com');
  const isWatchPage = window.location.pathname.includes('/watch');

  if (isYouTube && !isWatchPage) return;

  const isNetflix = window.location.hostname.includes('netflix.com');
  const netflixControl = isNetflix ? document.querySelector('[data-uia="control-audio-subtitle"]') : null;

  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.disablePictureInPicture) {
      video.disablePictureInPicture = false;
    }

    if (video.readyState === 0 || video.offsetWidth < 100 || video.offsetHeight < 100) {
      return;
    }

    const hoverTarget = video.closest('.html5-video-player, .watch-video, .videoplayer, .video-player, .player-container, [class*="player"]') || video.parentElement || video;

    if (!pipButtons.has(video)) {
      const btn = document.createElement('button');
      btn.title = 'Watch in Picture-in-Picture';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><rect x="13" y="13" width="8" height="8" rx="1" ry="1"></rect></svg>`;
      btn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
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
        opacity: 0;
        pointer-events: none;
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

      let hideTimeout = null;
      const resetHideTimeout = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
        hideTimeout = setTimeout(() => {
          hideBtn();
        }, 2000);
      };

      const showBtn = () => {
        if (window.location.hostname.includes('netflix.com') && document.querySelector('[data-uia="control-audio-subtitle"]')) {
          btn.style.opacity = '0';
          btn.style.pointerEvents = 'none';
          return;
        }
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
        resetHideTimeout();
      };
      const hideBtn = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
      };

      hoverTarget.addEventListener('mouseenter', showBtn);
      hoverTarget.addEventListener('mouseleave', hideBtn);
      hoverTarget.addEventListener('mousemove', showBtn);
      btn.addEventListener('mouseenter', showBtn);
      btn.addEventListener('mouseleave', hideBtn);

      // Auto-play next video if it finishes in PiP on YouTube
      video.addEventListener('ended', () => {
        if (document.pictureInPictureElement === video && isYouTube) {
          const nextBtn = document.querySelector('.ytp-next-button');
          if (nextBtn) nextBtn.click();
        }
      });

      // Ensure the container is positioned relatively so absolute offset works
      if (window.getComputedStyle(hoverTarget).position === 'static') {
        hoverTarget.style.position = 'relative';
      }
      hoverTarget.appendChild(btn);
      pipButtons.set(video, btn);
    }

    const btn = pipButtons.get(video);

    if (isNetflix && netflixControl) {
      const controlsContainer = netflixControl.parentElement?.parentElement;
      if (controlsContainer && !controlsContainer.querySelector('#clipo-netflix-pip')) {
        const wrapper = netflixControl.parentElement.cloneNode(true);
        wrapper.id = 'clipo-netflix-pip';
        wrapper.removeAttribute('data-uia');
        wrapper.querySelectorAll('[data-uia]').forEach(el => el.removeAttribute('data-uia'));
        
        const newBtn = wrapper.querySelector('button') || wrapper;
        newBtn.setAttribute('title', 'Watch in Picture-in-Picture');
        newBtn.style.transition = 'transform 0.3s ease';

        const svg = newBtn.querySelector('svg');
        if (svg) {
          svg.outerHTML = `<svg version="1.1" id="Picture_in_Picture" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="display: block; width: 100%; height: 100%; fill: currentColor;" xml:space="preserve"><g><title>Picture In Picture</title><g><path d="M19.6,11.2h-8.9v6.4h8.8L19.6,11.2z M23.9,19.8v-15c0-1.2-1-2.1-2.2-2.1H1.9c-1.2,0-2.2,0.9-2.2,2.1v15c0,1.2,1,2.1,2.2,2.1h19.9C22.9,21.9,23.9,21,23.9,19.8z M21.7,19.8H1.9v-15h19.9V19.8z"/></g></g></svg>`;
        }

        newBtn.addEventListener('click', async (e) => {
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

        // Add the zoom hover transition listeners
        newBtn.addEventListener('mouseover', () => {
          newBtn.style.transform = 'scale(1.2)';
        });
        newBtn.addEventListener('mouseout', () => {
          newBtn.style.transform = 'scale(1)';
        });

        controlsContainer.insertBefore(wrapper, controlsContainer.firstChild);
        pipButtons.set(video, newBtn);
        if (btn && btn.parentElement && btn !== newBtn) btn.remove();
      }
    }
  });
}

setInterval(injectButtons, 500);
