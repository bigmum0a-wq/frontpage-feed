/**
 * modal.js — Add Feed Modal Dialog
 *
 * Provides a clean modal dialog with non-blocking cancel/close handlers,
 * backdrop dismissal, and graceful error messages.
 */

export function openAddFeedModal(onSubmit) {
  let dialog = document.querySelector('#add-feed-modal');

  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'add-feed-modal';
    dialog.className = 'app-modal';
    document.body.append(dialog);

    // Close on backdrop click
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  }

  dialog.innerHTML = `
    <form class="add-feed-form" novalidate>
      <div class="modal-heading">
        <div>
          <p class="section-label">Your library</p>
          <h2>Add a feed</h2>
        </div>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <label>
        Feed name
        <input name="name" maxlength="80" placeholder="Example: CSS Weekly" autofocus>
      </label>
      <label>
        RSS feed URL
        <input name="url" type="text" placeholder="https://example.com/feed.xml">
      </label>
      <label>
        Category
        <select name="categoryId">
          <option value="frontend">Frontend</option>
          <option value="design">Design</option>
          <option value="backend-devops">Backend & DevOps</option>
          <option value="general-tech">General Tech</option>
          <option value="ai-ml">AI & ML</option>
        </select>
      </label>
      <p class="modal-note">The source is saved locally now. Live RSS fetching will be connected with the backend.</p>
      <div class="modal-error-message" style="display: none; color: #ef4444; font-size: 0.8rem; margin: -0.25rem 0 0.5rem 0;"></div>
      <div class="modal-actions">
        <button type="button" class="settings-btn-secondary" id="modal-cancel-btn" formnovalidate>Cancel</button>
        <button type="submit" class="settings-btn-primary">Add feed</button>
      </div>
    </form>`;

  const form = dialog.querySelector('.add-feed-form');
  const closeBtn = dialog.querySelector('.modal-close');
  const cancelBtn = dialog.querySelector('#modal-cancel-btn');
  const errorMsg = dialog.querySelector('.modal-error-message');

  const closeDialog = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
    form.querySelectorAll('input').forEach((input) => {
      input.setCustomValidity('');
    });
    dialog.close();
  };

  closeBtn?.addEventListener('click', closeDialog);
  cancelBtn?.addEventListener('click', closeDialog);

  form?.addEventListener('submit', (event) => {
    event.preventDefault();

    const data = new FormData(form);
    let name = String(data.get('name') ?? '').trim();
    let url = String(data.get('url') ?? '').trim();
    const categoryId = String(data.get('categoryId') ?? 'frontend');

    if (!name) {
      if (errorMsg) {
        errorMsg.textContent = 'Please enter a name for the feed.';
        errorMsg.style.display = 'block';
      }
      form.querySelector('input[name="name"]')?.focus();
      return;
    }

    if (!url) {
      if (errorMsg) {
        errorMsg.textContent = 'Please provide the RSS feed URL.';
        errorMsg.style.display = 'block';
      }
      form.querySelector('input[name="url"]')?.focus();
      return;
    }

    // Auto-prepend https:// if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    onSubmit({
      name,
      url,
      categoryId,
    });

    dialog.close();
  });

  if (!dialog.open) {
    dialog.showModal();
  }
}
