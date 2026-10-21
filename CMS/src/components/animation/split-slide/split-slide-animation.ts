export type SlideAnimationElements = {
  tiles: HTMLElement[];
  content: HTMLElement | null;
};

export const showSlideVisual = (
  { tiles, content }: SlideAnimationElements,
  instant = false,
) => {
  tiles.forEach((tile, i) => {
    const delay = instant ? 0 : (tiles.length - 1 - i) * 0.08;
    tile.style.transition = 'none';
    tile.style.opacity = '0';
    tile.style.transform = 'translate3d(26px, 0, 0)';
    tile.getBoundingClientRect();

    requestAnimationFrame(() => {
      tile.style.transition =
        `transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, opacity 0.6s ease ${delay}s`;
      tile.style.opacity = '1';
      tile.style.transform = 'translate3d(0, 0, 0)';
    });
  });

  if (content) {
    content.style.transition = 'none';
    content.style.opacity = instant ? '1' : '0';
    content.style.transform = instant ? 'translate3d(0, 0, 0)' : 'translate3d(16px, 0, 0)';
    content.getBoundingClientRect();

    requestAnimationFrame(() => {
      content.style.transition = 'opacity 0.55s ease 0.15s, transform 0.55s ease 0.15s';
      content.style.opacity = '1';
      content.style.transform = 'translate3d(0, 0, 0)';
    });
  }
};
