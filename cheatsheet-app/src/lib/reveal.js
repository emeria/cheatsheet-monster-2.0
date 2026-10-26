// Opens the section with this id (and any sections around it) and scrolls to it.
export function revealSection(id, behavior = 'smooth') {
  const el = document.getElementById(id);
  if (!el) return false;
  for (let node = el; node; node = node.parentElement) {
    if (node.tagName === 'DETAILS') node.open = true;
  }
  el.scrollIntoView({ behavior, block: 'start' });
  return true;
}

export function setAllOpen(container, open) {
  container?.querySelectorAll('details').forEach((details) => {
    details.open = open;
  });
}
