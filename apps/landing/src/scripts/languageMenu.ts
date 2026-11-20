function closeMenu(menu: HTMLDetailsElement, shouldFocusToggle: boolean): void {
  if (!menu.open) return;
  menu.open = false;
  if (shouldFocusToggle) menu.querySelector<HTMLElement>('summary')?.focus();
}

function moveFocus(menu: HTMLDetailsElement, step: number): void {
  const links = [...menu.querySelectorAll<HTMLAnchorElement>('a')];
  const currentIndex = links.indexOf(document.activeElement as HTMLAnchorElement);
  const nextIndex = (currentIndex + step + links.length) % links.length;
  links[nextIndex]?.focus();
}

export function initLanguageMenus(): void {
  const menus = [...document.querySelectorAll<HTMLDetailsElement>('[data-lang-menu]')];
  for (const menu of menus) {
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(menu, true);
      } else if (menu.open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        moveFocus(menu, event.key === 'ArrowDown' ? 1 : -1);
      }
    });
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      for (const other of menus) if (other !== menu) other.open = false;
    });
    menu.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && !menu.contains(next)) closeMenu(menu, false);
    });
  }
  document.addEventListener('pointerdown', (event) => {
    for (const menu of menus) {
      if (!menu.contains(event.target as Node)) closeMenu(menu, false);
    }
  });
}
