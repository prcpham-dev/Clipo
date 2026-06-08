const findVideo = () =>
  [...document.querySelectorAll('video')]
    .filter(v => v.readyState && !v.disablePictureInPicture)
    .sort((a, b) => {
      const area = el => { const r = el.getClientRects()[0]; return r ? r.width * r.height : 0; };
      return area(b) - area(a);
    })[0] ?? null;

const enterPip = async (video) => {
  await video.requestPictureInPicture();
  video.setAttribute('__pip__', true);
  video.addEventListener('leavepictureinpicture', () => video.removeAttribute('__pip__'), { once: true });
  new ResizeObserver((entries, obs) => {
    const watched = entries[0].target;
    if (!document.querySelector('[__pip__]')) return obs.unobserve(watched);
    const next = findVideo();
    if (next && !next.hasAttribute('__pip__')) { obs.unobserve(watched); enterPip(next); }
  }).observe(video);
};

(async () => {
  const video = findVideo();
  if (!video) return;
  video.hasAttribute('__pip__') ? document.exitPictureInPicture() : await enterPip(video);
})();
