const customSelects = document.querySelectorAll('.post-select-wrap select');

const closeCustomSelects = (except) => {
  document.querySelectorAll('.post-select-wrap.is-open').forEach((wrap) => {
    if (wrap !== except) {
      wrap.classList.remove('is-open');
      wrap.querySelector('.post-select-trigger')?.setAttribute('aria-expanded', 'false');
    }
  });
};

customSelects.forEach((select, index) => {
  const wrap = select.closest('.post-select-wrap');
  const selectedOption = select.options[select.selectedIndex];
  const menuId = `post-select-menu-${index}`;
  const trigger = document.createElement('button');
  const triggerLabel = document.createElement('span');
  const menu = document.createElement('div');

  wrap.classList.add('is-enhanced');
  trigger.type = 'button';
  trigger.className = 'post-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', menuId);
  triggerLabel.textContent = selectedOption.textContent;
  trigger.append(triggerLabel);

  menu.className = 'post-select-menu';
  menu.id = menuId;
  menu.setAttribute('role', 'listbox');

  [...select.options].forEach((option) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'post-select-option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    item.textContent = option.textContent;

    item.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      triggerLabel.textContent = option.textContent;
      menu.querySelectorAll('.post-select-option').forEach((choice) => choice.setAttribute('aria-selected', 'false'));
      item.setAttribute('aria-selected', 'true');
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });

    menu.append(item);
  });

  trigger.addEventListener('click', () => {
    const willOpen = !wrap.classList.contains('is-open');
    closeCustomSelects(wrap);
    wrap.classList.toggle('is-open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
  });

  wrap.append(trigger, menu);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.post-select-wrap')) {
    closeCustomSelects();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCustomSelects();
  }
});
