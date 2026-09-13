// ===================================================================
// Budget view — fishing expenses (fuel, tackle, food, maintenance)
// ===================================================================

function categoryById(id) {
  return ExpenseCategories.find((c) => c.id === id) || ExpenseCategories[ExpenseCategories.length - 1];
}

function expenseFilterRange(filter) {
  const now = new Date();
  if (filter === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return { start, end: Infinity };
  }
  if (filter === "lastMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return { start, end };
  }
  return { start: -Infinity, end: Infinity };
}

function renderBudget() {
  if (!State.expenseFilter) State.expenseFilter = "month";
  const { start, end } = expenseFilterRange(State.expenseFilter);
  const filtered = State.expenses.filter((e) => e.date >= start && e.date < end);
  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const byCategory = {};
  ExpenseCategories.forEach((c) => (byCategory[c.id] = 0));
  filtered.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0); });

  const filterLabels = { month: "This Month", lastMonth: "Last Month", all: "All Time" };

  root().innerHTML = `
    <div class="page-header">
      <h1>Budget</h1>
      <p>Track your fishing costs</p>
    </div>

    <div class="card score-card">
      <div class="score-label" style="text-align:center;">${filterLabels[State.expenseFilter].toUpperCase()} SPEND</div>
      <div class="budget-total">${formatCurrency(total, State.currency)}</div>
      <div class="grid-2" style="margin-top:14px;">
        ${ExpenseCategories.map((c) => `
          <div class="stat-tile">
            <div class="card-row" style="margin-bottom:2px;">
              <span style="color:var(--lagoon-deep); display:flex;">${icon(c.icon, 15)}</span>
              <span class="stat-label" style="margin:0;">${esc(c.name).toUpperCase()}</span>
            </div>
            <div class="stat-value" style="font-size:16px;">${formatCurrency(byCategory[c.id] || 0, State.currency)}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="chip-row" id="budget-filter-row">
      ${Object.entries(filterLabels).map(([key, label]) => `<button class="chip ${State.expenseFilter === key ? "active" : ""}" data-filter="${key}">${label}</button>`).join("")}
    </div>

    <div class="section-title">${filtered.length} expense${filtered.length === 1 ? "" : "s"}</div>
    <div class="card" style="padding:6px 10px;">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="icon">${icon("wallet", 34)}</div>
          <h3>No expenses yet</h3>
          <p>Log fuel, tackle, food or maintenance costs to see your fishing budget add up.</p>
          <button class="btn btn-primary" id="empty-add-expense">+ Add Expense</button>
        </div>
      ` : filtered.map((e) => expenseListItemHTML(e)).join("")}
    </div>
    <div class="spacer-lg"></div>
  `;

  $$("#budget-filter-row .chip").forEach((chip) => chip.addEventListener("click", () => {
    State.expenseFilter = chip.dataset.filter;
    renderBudget();
  }));
  $$(".expense-row").forEach((el) => el.addEventListener("click", () => openExpenseForm(State.expenses.find((e) => e.id === el.dataset.id))));
  $("#empty-add-expense")?.addEventListener("click", () => openExpenseForm());
}

function expenseListItemHTML(e) {
  const cat = categoryById(e.category);
  const trip = e.tripId ? State.trips.find((t) => t.id === e.tripId) : null;
  const d = new Date(e.date);
  return `
    <div class="list-item expense-row" data-id="${e.id}" style="cursor:pointer;">
      <div class="list-thumb placeholder" style="color:var(--lagoon-deep);">${icon(cat.icon, 22)}</div>
      <div class="list-main">
        <div class="list-title">${esc(e.description || cat.name)}</div>
        <div class="list-sub">${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}${trip ? " · " + esc(trip.name) : ""}</div>
      </div>
      <div style="font-family:var(--font-display); font-weight:700; font-size:15px;">${formatCurrency(e.amount, State.currency)}</div>
    </div>
  `;
}

function openExpenseForm(expense = null) {
  State.photoBuffer = expense?.photos ? [...expense.photos] : [];
  const isEdit = !!expense;

  openSheet(`
    <div class="sheet-header"><h2>${isEdit ? "Edit Expense" : "Add Expense"}</h2></div>

    <div class="field">
      <label>Category</label>
      <div class="species-grid" id="expense-category-grid">
        ${ExpenseCategories.map((c) => `<button type="button" class="species-btn ${expense?.category === c.id ? "active" : ""}" data-id="${c.id}"><span class="em">${icon(c.icon, 20)}</span>${esc(c.name)}</button>`).join("")}
      </div>
    </div>

    <div class="field-row">
      <div class="field"><label>Amount (${CurrencySymbols[State.currency] || State.currency})</label><input type="number" step="0.01" id="expense-amount" placeholder="e.g. 850" value="${expense?.amount ?? ""}"></div>
      <div class="field"><label>Date</label><input type="date" id="expense-date" value="${new Date(expense?.date || Date.now()).toISOString().slice(0, 10)}"></div>
    </div>

    <div class="field"><label>Description</label><input type="text" id="expense-desc" placeholder="e.g. Diesel top-up" value="${esc(expense?.description || "")}"></div>

    <div class="field">
      <label>Link to trip</label>
      <select id="expense-trip">
        <option value="">— None —</option>
        ${State.trips.map((t) => `<option value="${t.id}" ${expense?.tripId === t.id ? "selected" : ""}>${esc(t.name)} · ${new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</option>`).join("")}
      </select>
    </div>

    <div class="field">
      <label>Photos</label>
      <div class="photo-picker" id="expense-photo-picker">
        <label class="photo-add">＋<span>Add</span><input type="file" accept="image/*" capture="environment" multiple id="expense-photo-input" style="display:none;"></label>
        ${(expense?.photos || []).map((p) => `<div class="photo-thumb"><img src="${p}"></div>`).join("")}
      </div>
    </div>

    <div class="field"><label>Notes</label><textarea id="expense-notes" placeholder="Anything worth remembering...">${esc(expense?.notes || "")}</textarea></div>

    <div class="sheet-actions">
      ${isEdit ? `<button class="btn btn-danger" id="delete-expense-btn">Delete</button>` : ""}
      <button class="btn btn-primary btn-block" id="save-expense-btn">${isEdit ? "Save Changes" : "Add Expense"}</button>
    </div>
  `, { tall: true });

  let selectedCategory = expense?.category || null;
  $$("#expense-category-grid .species-btn").forEach((btn) => btn.addEventListener("click", () => {
    $$("#expense-category-grid .species-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedCategory = btn.dataset.id;
  }));

  $("#expense-photo-input").addEventListener("change", (e) => handlePhotoInput(e, "#expense-photo-picker"));

  $("#delete-expense-btn")?.addEventListener("click", async () => {
    if (!confirm("Delete this expense?")) return;
    await dbDelete("expenses", expense.id);
    await reloadAllData();
    closeSheet();
    toast("Expense deleted");
    renderBudget();
  });

  $("#save-expense-btn").addEventListener("click", async () => {
    const amount = parseFloat($("#expense-amount").value);
    if (!selectedCategory) { toast("Pick a category first", { icon: icon("alert", 14) }); return; }
    if (!amount || amount <= 0) { toast("Enter a valid amount", { icon: icon("alert", 14) }); return; }
    const dateVal = $("#expense-date").value ? new Date($("#expense-date").value + "T12:00:00").getTime() : Date.now();
    const record = {
      id: expense?.id || uid("exp"),
      date: dateVal,
      category: selectedCategory,
      amount,
      description: $("#expense-desc").value.trim(),
      tripId: $("#expense-trip").value || null,
      notes: $("#expense-notes").value.trim(),
      photos: [...State.photoBuffer],
    };
    await dbPut("expenses", record);
    await reloadAllData();
    closeSheet();
    toast(State.online ? "Expense saved ✓" : "Saved offline ✓", { icon: State.online ? icon("check", 14) : icon("wifiOff", 14) });
    renderBudget();
  });
}
