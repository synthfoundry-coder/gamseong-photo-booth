// Fallback for browsers (Safari) that do not yet support <dialog closedby="any">.
export function attachLightDismissFallback(dialog: HTMLDialogElement): () => void {
  if ('closedBy' in HTMLDialogElement.prototype) {
    return () => {};
  }

  const handleClick = (event: MouseEvent) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const insideContent =
      rect.top <= event.clientY &&
      event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX &&
      event.clientX <= rect.left + rect.width;
    if (insideContent) return;
    dialog.close();
  };

  dialog.addEventListener('click', handleClick);
  return () => dialog.removeEventListener('click', handleClick);
}
