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
        cursor: grab;
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        color: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        z-index: 2147483647;
        transition: transform 0.25s ease, background 0.25s ease, opacity 0.25s ease;
        opacity: 0;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      `;
      btn.addEventListener('mouseover', () => {
        btn.style.background = 'rgba(0, 0, 0, 0.7)';
        btn.style.transform = 'scale(1.1)';
      });
      btn.addEventListener('mouseout', () => {
        if (!isDragging) {
          btn.style.background = 'rgba(0, 0, 0, 0.4)';
          btn.style.transform = 'scale(1)';
        }
      });

      let isDragging = false;
      let hasDragged = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        hasDragged = false;
        startX = e.clientX;
        startY = e.clientY;

        const btnRect = btn.getBoundingClientRect();
        const containerRect = hoverTarget.getBoundingClientRect();

        initialLeft = btnRect.left - containerRect.left;
        initialTop = btnRect.top - containerRect.top;

        btn.style.transition = 'transform 0.25s ease, background 0.25s ease, opacity 0.25s ease';
        btn.style.left = `${initialLeft}px`;
        btn.style.top = `${initialTop}px`;
        btn.style.right = 'auto';
        btn.style.cursor = 'grabbing';
        btn.setPointerCapture(e.pointerId);

        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      });

      btn.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!hasDragged && Math.hypot(dx, dy) > 4) {
          hasDragged = true;
        }

        if (hasDragged) {
          const containerWidth = hoverTarget.clientWidth;
          const containerHeight = hoverTarget.clientHeight;
          const btnWidth = btn.offsetWidth;
          const btnHeight = btn.offsetHeight;

          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          newLeft = Math.max(0, Math.min(containerWidth - btnWidth, newLeft));
          newTop = Math.max(0, Math.min(containerHeight - btnHeight, newTop));

          btn.style.left = `${newLeft}px`;
          btn.style.top = `${newTop}px`;
          btn.style.right = 'auto';
        }
      });

      const handlePointerEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        btn.style.cursor = 'grab';

        try {
          btn.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (hasDragged) {
          const MARGIN = 16;
          const containerWidth = hoverTarget.clientWidth;
          const containerHeight = hoverTarget.clientHeight;
          const btnWidth = btn.offsetWidth;
          const btnHeight = btn.offsetHeight;

          const currentLeft = parseFloat(btn.style.left) || 0;
          const currentTop = parseFloat(btn.style.top) || MARGIN;

          const centerX = currentLeft + btnWidth / 2;
          const isCloserToLeft = centerX < containerWidth / 2;

          const snapTop = Math.max(MARGIN, Math.min(containerHeight - btnHeight - MARGIN, currentTop));

          btn.style.transition = 'left 0.8s cubic-bezier(0.1, 0.8, 0.2, 1), right 0.8s cubic-bezier(0.1, 0.8, 0.2, 1), top 0.8s cubic-bezier(0.1, 0.8, 0.2, 1), transform 0.25s ease, background 0.25s ease, opacity 0.25s ease';

          btn.style.top = `${snapTop}px`;
          btn.style.right = 'auto';

          if (isCloserToLeft) {
            btn.style.left = `${MARGIN}px`;
          } else {
            const targetLeft = Math.max(MARGIN, containerWidth - btnWidth - MARGIN);
            btn.style.left = `${targetLeft}px`;
          }

          setTimeout(() => {
            if (!isDragging) {
              btn.style.transition = 'transform 0.25s ease, background 0.25s ease, opacity 0.25s ease';
              if (!isCloserToLeft) {
                btn.style.left = 'auto';
                btn.style.right = `${MARGIN}px`;
              }
            }
          }, 850);
        }

        resetHideTimeout();
      };

      btn.addEventListener('pointerup', handlePointerEnd);
      btn.addEventListener('pointercancel', handlePointerEnd);

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasDragged) {
          return;
        }
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
        if (isDragging) return;
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
        if (isDragging) return;
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

      // Reset position when a new video loads in the same element
      video.addEventListener('loadstart', () => {
        btn.style.transition = 'transform 0.25s ease, background 0.25s ease, opacity 0.25s ease';
        btn.style.top = '16px';
        btn.style.right = '16px';
        btn.style.left = 'auto';
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
