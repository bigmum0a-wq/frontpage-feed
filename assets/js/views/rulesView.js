/**
 * rulesView.js — Smart Filters & Rules Manager View
 *
 * Renders the rules management interface embedded in the Settings view.
 * Allows creating, toggling, editing, and deleting automatic article rules.
 */
import {
  loadRules,
  createRule,
  deleteRule,
  toggleRule,
  updateRule,
  seedDefaultRules,
  FIELD_LABELS,
  OPERATOR_LABELS,
  ACTION_LABELS,
} from '../services/rulesService.js';
import { showToast } from '../components/toast.js';

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function initialiseRulesView(containerEl) {
  if (!containerEl) return;

  seedDefaultRules();
  renderRulesManager(containerEl);
}

// ─── Render Functions ──────────────────────────────────────────────────────────

function renderRulesManager(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'rules-header';
  header.innerHTML = `
    <div class="rules-header-text">
      <h2>⚡ Smart Filters &amp; Automation Rules</h2>
      <p class="rules-subtitle">Rules are automatically applied to articles when they load. Each rule can filter, save, or hide articles based on your criteria.</p>
    </div>
    <button type="button" class="btn btn-primary" id="btn-add-rule">+ New rule</button>
  `;

  container.appendChild(header);

  const rulesListEl = document.createElement('div');
  rulesListEl.className = 'rules-list';
  rulesListEl.id = 'rules-list';
  container.appendChild(rulesListEl);

  renderRulesList(rulesListEl);

  // New rule button
  container.querySelector('#btn-add-rule').onclick = () => {
    openRuleEditor(null, () => renderRulesManager(container));
  };
}

function renderRulesList(container) {
  const rules = loadRules();

  if (rules.length === 0) {
    container.innerHTML = `
      <div class="rules-empty">
        <div class="rules-empty-icon">⚡</div>
        <p>No rules configured.</p>
        <p class="rules-empty-hint">Create your first rule to automate your reading.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = rules
    .map((rule) => renderRuleCard(rule))
    .join('');

  // Wire up buttons
  container.querySelectorAll('[data-rule-toggle]').forEach((btn) => {
    btn.onclick = () => {
      const enabled = toggleRule(btn.dataset.ruleToggle);
      showToast(enabled ? `Rule enabled: ${btn.dataset.ruleName}` : `Rule disabled: ${btn.dataset.ruleName}`, 'info');
      renderRulesList(container);
    };
  });

  container.querySelectorAll('[data-rule-edit]').forEach((btn) => {
    btn.onclick = () => {
      const rules = loadRules();
      const rule = rules.find((r) => r.id === btn.dataset.ruleEdit);
      if (rule) openRuleEditor(rule, () => renderRulesList(container));
    };
  });

  container.querySelectorAll('[data-rule-delete]').forEach((btn) => {
    btn.onclick = () => {
      if (!confirm(`Delete rule "${btn.dataset.ruleName}"?`)) return;
      deleteRule(btn.dataset.ruleDelete);
      showToast('Rule deleted.', 'info');
      renderRulesList(container);
    };
  });
}

function renderRuleCard(rule) {
  const conditionSummary = (rule.conditions || [])
    .slice(0, 2)
    .map((c) => `<em>${FIELD_LABELS[c.field] || c.field}</em> ${OPERATOR_LABELS[c.operator] || c.operator} "<strong>${escapeHtml(c.value)}</strong>"`)
    .join(rule.conditionLogic === 'any' ? ' <span class="rule-logic-badge">OR</span> ' : ' <span class="rule-logic-badge">AND</span> ');

  const extraConditions = (rule.conditions || []).length > 2
    ? ` <span class="rule-more-badge">+${rule.conditions.length - 2} more</span>` : '';

  const actionsSummary = (rule.actions || [])
    .map((a) => `<span class="rule-action-pill">${ACTION_LABELS[a.type] || a.type}${a.value ? ` : ${escapeHtml(a.value)}` : ''}</span>`)
    .join('');

  return `
    <div class="rule-card ${rule.enabled ? 'is-enabled' : 'is-disabled'}">
      <div class="rule-card-header">
        <div class="rule-card-title-row">
          <label class="rule-toggle-switch" title="${rule.enabled ? 'Disable' : 'Enable'} rule">
            <input
              type="checkbox"
              class="rule-toggle-input"
              ${rule.enabled ? 'checked' : ''}
              data-rule-toggle="${rule.id}"
              data-rule-name="${escapeAttr(rule.name)}"
              aria-label="${rule.enabled ? 'Disable' : 'Enable'} rule ${escapeAttr(rule.name)}"
            >
            <span class="rule-toggle-slider"></span>
          </label>
          <h3 class="rule-name">${escapeHtml(rule.name)}</h3>
          ${rule.matchCount > 0 ? `<span class="rule-match-count">${rule.matchCount} match${rule.matchCount > 1 ? 'es' : ''}</span>` : ''}
        </div>
        <div class="rule-card-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-rule-edit="${rule.id}" aria-label="Edit rule ${escapeAttr(rule.name)}">✏️ Edit</button>
          <button type="button" class="btn btn-ghost btn-sm btn-danger" data-rule-delete="${rule.id}" data-rule-name="${escapeAttr(rule.name)}" aria-label="Delete rule ${escapeAttr(rule.name)}">🗑</button>
        </div>
      </div>

      <div class="rule-card-body">
        <div class="rule-conditions-row">
          <span class="rule-section-label">If:</span>
          <span class="rule-conditions-text">${conditionSummary}${extraConditions}</span>
        </div>
        <div class="rule-actions-row">
          <span class="rule-section-label">Then:</span>
          <div class="rule-actions-pills">${actionsSummary || '<span class="rule-no-action">No actions</span>'}</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Rule Editor Modal ────────────────────────────────────────────────────────

function openRuleEditor(existingRule, onSave) {
  let modalEl = document.getElementById('rule-editor-modal');
  if (modalEl) modalEl.remove();

  const isEdit = Boolean(existingRule);

  modalEl = document.createElement('dialog');
  modalEl.id = 'rule-editor-modal';
  modalEl.className = 'rule-editor-modal';

  const initialConditions = existingRule?.conditions?.length
    ? existingRule.conditions
    : [{ field: 'title', operator: 'contains', value: '' }];

  const initialActions = existingRule?.actions?.length
    ? existingRule.actions
    : [{ type: 'mark_saved', value: '' }];

  modalEl.innerHTML = `
    <div class="rule-editor-inner">
      <div class="rule-editor-header">
        <h2>${isEdit ? '✏️ Edit rule' : '⚡ New rule'}</h2>
        <button type="button" class="rule-editor-close" aria-label="Close">&times;</button>
      </div>

      <div class="rule-editor-form">

        <!-- Rule Name -->
        <div class="rule-field-group">
          <label class="rule-field-label" for="rule-name-input">Rule name</label>
          <input
            type="text"
            id="rule-name-input"
            class="rule-text-input"
            placeholder="e.g. AI &amp; ML Alerts"
            value="${escapeAttr(existingRule?.name || '')}"
          >
        </div>

        <!-- Condition Logic -->
        <div class="rule-field-group">
          <label class="rule-field-label">Condition logic</label>
          <div class="rule-logic-toggle">
            <label class="rule-logic-option">
              <input type="radio" name="rule-logic" value="all" ${existingRule?.conditionLogic !== 'any' ? 'checked' : ''}>
              <span>All (AND)</span>
            </label>
            <label class="rule-logic-option">
              <input type="radio" name="rule-logic" value="any" ${existingRule?.conditionLogic === 'any' ? 'checked' : ''}>
              <span>At least one (OR)</span>
            </label>
          </div>
        </div>

        <!-- Conditions -->
        <div class="rule-field-group">
          <label class="rule-field-label">Conditions <span class="rule-field-hint">(articles must match)</span></label>
          <div class="rule-conditions-builder" id="conditions-builder"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-condition">+ Add condition</button>
        </div>

        <!-- Actions -->
        <div class="rule-field-group">
          <label class="rule-field-label">Actions <span class="rule-field-hint">(applied when conditions are met)</span></label>
          <div class="rule-actions-builder" id="actions-builder"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-action">+ Add action</button>
        </div>
      </div>

      <div class="rule-editor-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancel-rule">Cancel</button>
        <button type="button" class="btn btn-primary" id="btn-save-rule">${isEdit ? '💾 Save' : '⚡ Create rule'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Render condition/action builders
  const conditionsBuilder = modalEl.querySelector('#conditions-builder');
  const actionsBuilder = modalEl.querySelector('#actions-builder');

  let conditions = [...initialConditions];
  let actions = [...initialActions];

  function renderConditions() {
    conditionsBuilder.innerHTML = conditions
      .map((c, i) => buildConditionRow(c, i))
      .join('');

    conditionsBuilder.querySelectorAll('[data-remove-condition]').forEach((btn) => {
      btn.onclick = () => {
        conditions.splice(parseInt(btn.dataset.removeCondition, 10), 1);
        if (conditions.length === 0) conditions.push({ field: 'title', operator: 'contains', value: '' });
        renderConditions();
      };
    });

    conditionsBuilder.querySelectorAll('select[data-condition-field]').forEach((sel) => {
      sel.onchange = () => { conditions[sel.dataset.conditionField].field = sel.value; };
    });

    conditionsBuilder.querySelectorAll('select[data-condition-op]').forEach((sel) => {
      sel.onchange = () => { conditions[sel.dataset.conditionOp].operator = sel.value; };
    });

    conditionsBuilder.querySelectorAll('input[data-condition-val]').forEach((inp) => {
      inp.oninput = () => { conditions[inp.dataset.conditionVal].value = inp.value; };
    });
  }

  function renderActions() {
    actionsBuilder.innerHTML = actions
      .map((a, i) => buildActionRow(a, i))
      .join('');

    actionsBuilder.querySelectorAll('[data-remove-action]').forEach((btn) => {
      btn.onclick = () => {
        actions.splice(parseInt(btn.dataset.removeAction, 10), 1);
        if (actions.length === 0) actions.push({ type: 'mark_saved', value: '' });
        renderActions();
      };
    });

    actionsBuilder.querySelectorAll('select[data-action-type]').forEach((sel) => {
      sel.onchange = () => { actions[sel.dataset.actionType].type = sel.value; renderActions(); };
    });

    actionsBuilder.querySelectorAll('input[data-action-val]').forEach((inp) => {
      inp.oninput = () => { actions[inp.dataset.actionVal].value = inp.value; };
    });
  }

  renderConditions();
  renderActions();

  // Add condition/action
  modalEl.querySelector('#btn-add-condition').onclick = () => {
    conditions.push({ field: 'title', operator: 'contains', value: '' });
    renderConditions();
  };

  modalEl.querySelector('#btn-add-action').onclick = () => {
    actions.push({ type: 'mark_read', value: '' });
    renderActions();
  };

  // Close
  const closeModal = () => {
    modalEl.close();
    modalEl.remove();
  };

  modalEl.querySelector('.rule-editor-close').onclick = closeModal;
  modalEl.querySelector('#btn-cancel-rule').onclick = closeModal;

  // Save
  modalEl.querySelector('#btn-save-rule').onclick = () => {
    // Read fresh values from inputs before saving
    conditionsBuilder.querySelectorAll('select[data-condition-field]').forEach((sel) => {
      conditions[parseInt(sel.dataset.conditionField, 10)].field = sel.value;
    });
    conditionsBuilder.querySelectorAll('select[data-condition-op]').forEach((sel) => {
      conditions[parseInt(sel.dataset.conditionOp, 10)].operator = sel.value;
    });
    conditionsBuilder.querySelectorAll('input[data-condition-val]').forEach((inp) => {
      conditions[parseInt(inp.dataset.conditionVal, 10)].value = inp.value.trim();
    });
    actionsBuilder.querySelectorAll('select[data-action-type]').forEach((sel) => {
      actions[parseInt(sel.dataset.actionType, 10)].type = sel.value;
    });
    actionsBuilder.querySelectorAll('input[data-action-val]').forEach((inp) => {
      actions[parseInt(inp.dataset.actionVal, 10)].value = inp.value.trim();
    });

    const name = modalEl.querySelector('#rule-name-input').value.trim() || 'Unnamed rule';
    const conditionLogic = modalEl.querySelector('input[name="rule-logic"]:checked')?.value || 'all';

    const validConditions = conditions.filter((c) => c.value || c.field === 'feedId');
    if (validConditions.length === 0) {
      showToast('Please add at least one condition with a value.', 'error');
      return;
    }

    if (isEdit) {
      updateRule(existingRule.id, { name, conditions: validConditions, conditionLogic, actions });
      showToast(`Rule "${name}" updated.`, 'success');
    } else {
      createRule({ name, conditions: validConditions, conditionLogic, actions });
      showToast(`Rule "${name}" created successfully!`, 'success');
    }

    closeModal();
    onSave?.();
  };

  // Open dialog
  modalEl.showModal();

  // Close on backdrop click
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeModal();
  });
}

// ─── Builder Helpers ──────────────────────────────────────────────────────────

function buildConditionRow(condition, index) {
  const fieldOptions = Object.entries(FIELD_LABELS)
    .map(([v, l]) => `<option value="${v}" ${condition.field === v ? 'selected' : ''}>${l}</option>`)
    .join('');

  const operatorOptions = Object.entries(OPERATOR_LABELS)
    .map(([v, l]) => `<option value="${v}" ${condition.operator === v ? 'selected' : ''}>${l}</option>`)
    .join('');

  return `
    <div class="rule-row">
      <select class="rule-select" data-condition-field="${index}" aria-label="Condition field">
        ${fieldOptions}
      </select>
      <select class="rule-select" data-condition-op="${index}" aria-label="Condition operator">
        ${operatorOptions}
      </select>
      <input
        type="text"
        class="rule-text-input rule-value-input"
        data-condition-val="${index}"
        placeholder="value..."
        value="${escapeAttr(condition.value || '')}"
        aria-label="Condition value"
      >
      <button type="button" class="btn btn-ghost btn-sm btn-danger" data-remove-condition="${index}" aria-label="Remove this condition">✕</button>
    </div>
  `;
}

function buildActionRow(action, index) {
  const actionOptions = Object.entries(ACTION_LABELS)
    .map(([v, l]) => `<option value="${v}" ${action.type === v ? 'selected' : ''}>${l}</option>`)
    .join('');

  const needsValue = action.type === 'add_tag';

  return `
    <div class="rule-row">
      <select class="rule-select" data-action-type="${index}" aria-label="Action type">
        ${actionOptions}
      </select>
      ${needsValue ? `
        <input
          type="text"
          class="rule-text-input rule-value-input"
          data-action-val="${index}"
          placeholder="tag name..."
          value="${escapeAttr(action.value || '')}"
          aria-label="Action value"
        >
      ` : `<div class="rule-action-spacer"></div>`}
      <button type="button" class="btn btn-ghost btn-sm btn-danger" data-remove-action="${index}" aria-label="Remove this action">✕</button>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
