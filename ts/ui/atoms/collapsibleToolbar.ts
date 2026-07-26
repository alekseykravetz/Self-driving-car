/**
 * makeToolbarCollapsible — shared helper that turns any floating toolbar
 * custom element into a collapsible panel.
 *
 * It injects, at the LEFT edge of the toolbar, a slim full-height collapse
 * button. All of the toolbar's existing content is moved into a
 * `.toolbar-body` wrapper. A `.toolbar-collapsed-summary` element is added
 * that, when collapsed, shows only the toolbar's name plus the names of its
 * sections (read live from the `.controls-group-label` texts, so dynamically
 * rendered toolbars stay accurate).
 *
 * Purely presentational: it registers no keyboard listeners and owns no
 * toolbar state. Collapse state is persisted per toolbar id in localStorage.
 *
 * Call this at the END of a toolbar's `connectedCallback`, after the toolbar
 * has rendered its own content.
 */
export function makeToolbarCollapsible(host: HTMLElement, name: string): void {
  // Idempotent — a custom element may be re-connected when moved in the DOM.
  if (host.querySelector(':scope > .toolbar-collapse-btn')) return;

  host.classList.add('collapsible-toolbar');

  // Move existing children into a body wrapper.
  const body = document.createElement('div');
  body.className = 'toolbar-body';
  while (host.firstChild) body.appendChild(host.firstChild);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toolbar-collapse-btn';
  btn.setAttribute('aria-label', `Collapse ${name} toolbar`);
  btn.innerHTML = '<span class="toolbar-collapse-icon">‹</span>';

  const summary = document.createElement('div');
  summary.className = 'toolbar-collapsed-summary';

  host.appendChild(btn);
  host.appendChild(body);
  host.appendChild(summary);

  const storageKey = `toolbar-collapsed:${host.id || name}`;

  const updateSummary = (): void => {
    summary.textContent = '';

    const nameEl = document.createElement('span');
    nameEl.className = 'toolbar-name';
    nameEl.textContent = name;
    summary.appendChild(nameEl);

    const labels = Array.from(
      body.querySelectorAll<HTMLElement>('.controls-group-label'),
    )
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.textContent?.trim() ?? '')
      .filter((t) => t.length > 0);

    for (const label of labels) {
      const sectionEl = document.createElement('span');
      sectionEl.className = 'toolbar-summary-section';
      sectionEl.textContent = label;
      summary.appendChild(sectionEl);
    }
  };

  const setCollapsed = (collapsed: boolean): void => {
    // Compute the summary while the body is still laid out so hidden groups
    // can be detected (offsetParent is null once the body is display:none).
    if (collapsed) updateSummary();
    host.classList.toggle('collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute(
      'aria-label',
      `${collapsed ? 'Expand' : 'Collapse'} ${name} toolbar`,
    );
    try {
      localStorage.setItem(storageKey, collapsed ? '1' : '0');
    } catch {
      /* localStorage unavailable (e.g. tests) — ignore */
    }
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setCollapsed(!host.classList.contains('collapsed'));
  });

  // Clicking the collapsed summary re-expands the toolbar.
  summary.addEventListener('click', () => setCollapsed(false));

  let initialCollapsed = false;
  try {
    initialCollapsed = localStorage.getItem(storageKey) === '1';
  } catch {
    /* ignore */
  }
  setCollapsed(initialCollapsed);
}
