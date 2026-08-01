/**
 * TapCocktail Lovelace Card
 * Version 1.1.0
 *
 * Example:
 * type: custom:tapcocktail-card
 * tap: 1
 *
 * Cocktail-dropdownen grupperes automatisk efter kategori
 * fra sensor.tapcocktail_library.
 */

class TapCocktailCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._lastRenderKey = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Manglende kortkonfiguration");

    const tap = Number(config.tap ?? 1);
    if (!Number.isInteger(tap) || tap < 1) {
      throw new Error("'tap' skal være et positivt heltal");
    }

    this._config = {
      tap,
      name: config.name ?? `Hane ${tap}`,
      show_details: config.show_details !== false,
      show_cocktail_select: config.show_cocktail_select !== false,
      show_glass: config.show_glass !== false,
      show_bubbles: config.show_bubbles !== false,
      show_progress: config.show_progress !== false,
      show_controls: config.show_controls !== false,
      show_time_on_tap: config.show_time_on_tap !== false,
      show_shelf_life: config.show_shelf_life !== false,
      show_serving_tips: config.show_serving_tips !== false,
      show_recipe: config.show_recipe !== false,
      show_status: config.show_status !== false,
      show_tap_name: config.show_tap_name !== false,
      layout_preset: config.layout_preset ?? "custom",
      recipe_mode: config.recipe_mode ?? "button",
      recipe_amount: config.recipe_amount ?? "glass",
      recipe_large_text: config.recipe_large_text === true,
      compact: config.compact === true,
      preview_cocktail_id: config.preview_cocktail_id ?? null,
      ...config,
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const key = this._buildRenderKey();

    if (key !== this._lastRenderKey) {
      this._lastRenderKey = key;
      this._render();
    }
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {
      tap: 1,
      name: "Hane 1",
      show_cocktail_select: true,
      show_details: true,
      show_glass: true,
      show_bubbles: true,
      show_progress: true,
      show_controls: true,
      show_time_on_tap: true,
      show_shelf_life: true,
      show_serving_tips: true,
      show_recipe: true,
      show_status: true,
      show_tap_name: true,
      recipe_mode: "button",
      recipe_amount: "glass",
      recipe_large_text: false,
      compact: false,
    };
  }

  static getConfigElement() {
    return document.createElement("tapcocktail-card-editor");
  }

  _entityIds() {
    const tap = this._config?.tap ?? 1;

    return {
      cocktail: `sensor.tapcocktail_hane_${tap}`,
      library: "sensor.tapcocktail_library",
      selection: `select.hane_${tap}_cocktail`,
      legacySelection: `input_select.tapcocktail_hane_${tap}`,
      carbonationSelect: `select.hane_${tap}_karbonering`,
      startButton: `button.hane_${tap}_start_karbonering`,
      stopButton: `button.hane_${tap}_stop_karbonering`,
      status: `sensor.hane_${tap}_status`,
      progress: `sensor.hane_${tap}_progress`,
      remaining: `sensor.hane_${tap}_remaining`,
      finished: `sensor.hane_${tap}_faerdig`,
      timeOnTap: `sensor.hane_${tap}_tid_pa_fad`,
    };
  }

  _state(entityId) {
    return this._hass?.states?.[entityId];
  }

  _buildRenderKey() {
    if (!this._hass || !this._config) return "";

    const entityKey = Object.values(this._entityIds())
      .map((entityId) => {
        const entity = this._state(entityId);
        return entity
          ? `${entityId}:${entity.state}:${entity.last_changed}`
          : `${entityId}:missing`;
      })
      .join("|");

    // Shelf-life and "time on tap" labels change as time passes, even when
    // Home Assistant entity states themselves have not changed.
    return `${entityKey}|minute:${Math.floor(Date.now() / 60000)}`;
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  _displayIcon(icon, fallback = "🍹") {
    const value = String(icon ?? "").trim();
    if (!value) return fallback;
    return value;
  }

  _formatHours(value) {
    const totalHours = Math.max(0, Math.round(this._number(value, 0)));

    if (totalHours < 24) {
      return totalHours === 1 ? "1 time" : `${totalHours} timer`;
    }

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const dayText = days === 1 ? "1 dag" : `${days} dage`;

    if (hours === 0) return dayText;

    const hourText = hours === 1 ? "1 time" : `${hours} timer`;
    return `${dayText} og ${hourText}`;
  }

  _formatTimestamp(entity) {
    if (!entity || ["unknown", "unavailable", "none", ""].includes(entity.state)) {
      return null;
    }

    const date = new Date(entity.state);
    if (Number.isNaN(date.getTime())) return null;

    const diffMs = date.getTime() - Date.now();
    const absMinutes = Math.round(Math.abs(diffMs) / 60000);

    if (absMinutes < 1) {
      return diffMs >= 0 ? "om få sekunder" : "Få sekunder";
    }

    if (absMinutes < 60) {
      if (diffMs >= 0) {
        return `om ${absMinutes} min.`;
      }

      return absMinutes === 1
        ? "1 minut"
        : `${absMinutes} minutter`;
    }

    const hours = Math.round(absMinutes / 60);

    if (hours < 24) {
      if (diffMs >= 0) {
        return `om ${hours} t.`;
      }

      return this._formatHours(hours);
    }

    const formatted = this._formatHours(hours);
    return diffMs >= 0 ? `om ${formatted}` : formatted;
  }

  _statusPresentation(status) {
    switch (status) {
      case "carbonating":
        return { label: "Karbonerer", icon: "mdi:weather-windy", css: "carbonating" };
      case "ready":
        return { label: "Klar", icon: "mdi:check-circle", css: "ready" };
      default:
        return { label: "Ikke startet", icon: "mdi:pause-circle", css: "idle" };
    }
  }

  _shelfLifePresentation(shelfLife, readyEntity) {
    const days = Number(shelfLife?.days);
    if (!Number.isFinite(days) || days <= 0 || !readyEntity) return null;
    if (["unknown", "unavailable", "none", ""].includes(readyEntity.state)) {
      return null;
    }

    const started = new Date(readyEntity.state);
    if (Number.isNaN(started.getTime())) return null;

    const dayMs = 24 * 60 * 60 * 1000;
    const elapsedDays = Math.max(0, (Date.now() - started.getTime()) / dayMs);
    const remaining = Math.ceil(days - elapsedDays);
    const usedRatio = elapsedDays / days;

    if (remaining < 0) {
      const overdue = Math.abs(remaining);
      return {
        css: "expired",
        label: `Holdbarhed overskredet med ${overdue} ${overdue === 1 ? "dag" : "dage"}`,
        detail: `Anbefalet holdbarhed: ${days} dage`,
      };
    }

    return {
      css: usedRatio >= 0.8 ? "warning" : "fresh",
      label:
        remaining === 0
          ? "Sidste anbefalede dag"
          : `${remaining} ${remaining === 1 ? "dag" : "dage"} tilbage`,
      detail: `Holdbarhed: ${days} dage`,
    };
  }


  _categoryLabel(category) {
    const raw = String(category || "Andre").trim();

    if (!raw) return "Andre";

    return raw
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  _buildCocktailOptionHtml(options, selected, libraryEntity) {
    if (!options.length) {
      return "<option>Ingen cocktails fundet</option>";
    }

    const library = libraryEntity?.attributes?.cocktails;

    if (!library || typeof library !== "object") {
      return options
        .map(
          (option) =>
            `<option value="${this._escape(option)}" ${
              option === selected ? "selected" : ""
            }>${this._escape(option)}</option>`
        )
        .join("");
    }

    const cocktails = Object.entries(library).map(([id, cocktail]) => {
      const data = cocktail && typeof cocktail === "object" ? cocktail : {};
      const name = String(data.navn ?? data.name ?? id);
      const icon = this._displayIcon(data.ikon ?? data.icon, "");

      return {
        id: String(id),
        name,
        displayName: icon ? `${icon} ${name}` : name,
        category: this._categoryLabel(data.kategori ?? data.category),
      };
    });

    const groups = new Map();

    options.forEach((option) => {
      const normalizedOption = String(option).trim();

      const match = cocktails.find((cocktail) => (
        normalizedOption === cocktail.displayName ||
        normalizedOption === cocktail.name ||
        normalizedOption === cocktail.id
      ));

      const category = match?.category ?? "Andre";

      if (!groups.has(category)) {
        groups.set(category, []);
      }

      groups.get(category).push(option);
    });

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "da"))
      .map(([category, categoryOptions]) => {
        const optionsHtml = categoryOptions
          .map(
            (option) =>
              `<option value="${this._escape(option)}" ${
                option === selected ? "selected" : ""
              }>${this._escape(option)}</option>`
          )
          .join("");

        return `<optgroup label="${this._escape(category)}">${optionsHtml}</optgroup>`;
      })
      .join("");
  }

  _recipeHtml({
    ingredients,
    method,
    garnish,
    notes,
    carbonationHours,
    amountMode = "glass",
    largeText = false,
  }) {
    const modes = {
      glass: { label: "Pr. glas", key: "glas" },
      two_liter: { label: "2 liter", key: "2_liter" },
      nine_liter: { label: "9 liter", key: "9_liter" },
    };

    const selected = modes[amountMode] ?? modes.glass;

    const recipeRows = ingredients
      .map((item) => {
        const name = String(item?.navn ?? item?.name ?? "").trim();
        const amount = String(
          item?.[selected.key] ??
          (selected.key === "2_liter"
            ? item?.two_liter
            : selected.key === "9_liter"
              ? item?.nine_liter
              : item?.glass) ??
          ""
        ).trim();

        return { name, amount };
      })
      .filter((item) => item.name && item.amount);

    const rows = recipeRows
      .map(
        (item) => `
          <tr>
            <td>${this._escape(item.name)}</td>
            <td>${this._escape(item.amount)}</td>
          </tr>
        `
      )
      .join("");

    const copyText = recipeRows
      .map((item) => `${item.name}: ${item.amount}`)
      .join("\n");

    return `
      <div class="recipe-sheet ${largeText ? "large-text" : ""}">
        <div class="recipe-header">
          <div>
            <div class="recipe-kicker">📖 Opskrift</div>
            <div class="recipe-title">Blandingsoversigt</div>
          </div>
          <button class="recipe-close" id="recipe-close" aria-label="Luk opskrift">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="recipe-toolbar">
          <label class="recipe-amount-field">
            Mængde
            <select id="recipe-amount-select">
              <option value="glass" ${amountMode === "glass" ? "selected" : ""}>Pr. glas</option>
              <option value="two_liter" ${amountMode === "two_liter" ? "selected" : ""}>2 liter</option>
              <option value="nine_liter" ${amountMode === "nine_liter" ? "selected" : ""}>9 liter</option>
            </select>
          </label>

          <button class="recipe-tool-button" id="recipe-copy" data-copy="${this._escape(copyText)}">
            <ha-icon icon="mdi:content-copy"></ha-icon>
            Kopiér
          </button>

          <button class="recipe-tool-button" id="recipe-print">
            <ha-icon icon="mdi:printer"></ha-icon>
            Print
          </button>
        </div>

        ${
          rows
            ? `
              <div class="recipe-table-wrap">
                <table class="recipe-table">
                  <thead>
                    <tr>
                      <th>Ingrediens</th>
                      <th>${this._escape(selected.label)}</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            `
            : `<div class="recipe-empty">Der er ingen gemte mængder til ${this._escape(selected.label.toLowerCase())}.</div>`
        }

        ${method ? `<div class="recipe-block"><div class="recipe-block-title">Fremgangsmåde</div><div class="recipe-block-text">${this._escape(method)}</div></div>` : ""}
        ${garnish ? `<div class="recipe-block"><div class="recipe-block-title">Pynt</div><div class="recipe-block-text">${this._escape(garnish)}</div></div>` : ""}
        ${carbonationHours !== null ? `<div class="recipe-block"><div class="recipe-block-title">Karboneringstid</div><div class="recipe-block-text">${this._escape(this._formatHours(carbonationHours))}</div></div>` : ""}
        ${notes ? `<div class="recipe-block"><div class="recipe-block-title">Noter</div><div class="recipe-block-text">${this._escape(notes)}</div></div>` : ""}
      </div>
    `;
  }

  _recipeDataFromAttributes(attrs) {
    return {
      ingredients: Array.isArray(attrs.ingredienser) ? attrs.ingredienser : [],
      method: attrs.fremgangsmaade ?? attrs.fremgangsmåde ?? attrs.method ?? "",
      garnish: attrs.pynt ?? attrs.garnish ?? "",
      notes: attrs.noter ?? attrs.notes ?? "",
      carbonationHours:
        attrs.karbonering?.tid_timer ??
        attrs.karboneringstid_timer ??
        attrs.carbonation_hours ??
        null,
    };
  }

  _bindRecipeSheet(sheet, attrs, dialog = null) {
    const rebuild = (amountMode) => {
      const html = this._recipeHtml({
        ...this._recipeDataFromAttributes(attrs),
        amountMode,
        largeText: this._config.recipe_large_text,
      });

      if (dialog) {
        dialog.innerHTML = html;
        this._bindRecipeSheet(dialog.querySelector(".recipe-sheet"), attrs, dialog);
      } else if (sheet) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const replacement = wrapper.firstElementChild;
        sheet.replaceWith(replacement);
        this._bindRecipeSheet(replacement, attrs, null);
      }
    };

    sheet?.querySelector("#recipe-amount-select")?.addEventListener("change", (event) => {
      rebuild(event.target.value);
    });

    sheet?.querySelector("#recipe-copy")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const copyText = button?.dataset?.copy ?? "";

      try {
        await navigator.clipboard.writeText(copyText);
        button.innerHTML = '<ha-icon icon="mdi:check"></ha-icon>Kopieret';
      } catch (error) {
        console.error("TapCocktail: Kunne ikke kopiere opskrift", error);
      }
    });

    sheet?.querySelector("#recipe-print")?.addEventListener("click", () => {
      const printWindow = window.open("", "_blank", "width=820,height=900");
      if (!printWindow) return;

      printWindow.document.write(`
        <!doctype html>
        <html lang="da">
          <head>
            <meta charset="utf-8">
            <title>TapCocktail opskrift</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
              button, select, label { display: none !important; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ccc; }
              .recipe-title { font-size: 28px; font-weight: 800; }
              .recipe-kicker, .recipe-block-title { font-weight: 700; margin-top: 18px; }
              .recipe-block { margin-top: 18px; }
              .recipe-block-text { white-space: pre-line; line-height: 1.5; }
            </style>
          </head>
          <body>${sheet?.outerHTML ?? ""}</body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    });

    sheet?.querySelector("#recipe-close")?.addEventListener("click", () => {
      if (dialog) dialog.close();
      else sheet.remove();
    });
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    if (!this._hass) {
      this.shadowRoot.innerHTML = "<ha-card><div class='message'>Indlæser TapCocktail…</div></ha-card>";
      return;
    }

    const ids = this._entityIds();
    const cocktailEntity = this._state(ids.cocktail);

    if (!cocktailEntity) {
      this.shadowRoot.innerHTML = `<ha-card><div class="message">Kunne ikke finde <code>${this._escape(ids.cocktail)}</code></div></ha-card>`;
      return;
    }

    const libraryEntity = this._state(ids.library);
    const cocktailSelect =
      this._state(ids.selection) ??
      this._state(ids.legacySelection);
    const carbonationSelect = this._state(ids.carbonationSelect);
    const startButton = this._state(ids.startButton);
    const stopButton = this._state(ids.stopButton);
    const statusEntity = this._state(ids.status);
    const progressEntity = this._state(ids.progress);
    const remainingEntity = this._state(ids.remaining);
    const finishedEntity = this._state(ids.finished);
    const timeOnTapEntity = this._state(ids.timeOnTap);

    const liveAttrs = cocktailEntity.attributes ?? {};
    const libraryCocktails = libraryEntity?.attributes?.cocktails ?? {};
    const previewCocktail =
      this._config.preview_cocktail_id &&
      libraryCocktails &&
      typeof libraryCocktails === "object"
        ? libraryCocktails[this._config.preview_cocktail_id]
        : null;

    const attrs =
      previewCocktail && typeof previewCocktail === "object"
        ? previewCocktail
        : liveAttrs;

    const cocktailName =
      previewCocktail?.navn ??
      previewCocktail?.name ??
      cocktailEntity.state ??
      "Ingen cocktail";

    const compactCocktailName = attrs.navn || attrs.name || cocktailName;
    const titleLength = compactCocktailName.length;

    let cocktailFontSize = "25px";
    if (titleLength > 30) {
      cocktailFontSize = "17px";
    } else if (titleLength > 24) {
      cocktailFontSize = "19px";
    } else if (titleLength > 18) {
      cocktailFontSize = "22px";
    }

    const icon = this._displayIcon(attrs.ikon ?? attrs.icon);
    const color = attrs.farve || attrs.color || "#7ed957";
    const abv = attrs.abv;
    const co2 = attrs.co2 ?? attrs.vol_co2;
    const temperature = attrs.temperatur ?? attrs.temperature;
    const glass = attrs.glas ?? attrs.glass;
    const shelfLife = attrs.holdbarhed ?? attrs.shelf_life;
    const servingTips =
      attrs.serveringstips ??
      attrs.servering_tip ??
      attrs.serving_tips ??
      "Ingen serveringstips endnu";

    const ingredients = Array.isArray(attrs.ingredienser)
      ? attrs.ingredienser
      : [];

    const method =
      attrs.fremgangsmaade ??
      attrs.fremgangsmåde ??
      attrs.method ??
      "";

    const garnish =
      attrs.pynt ??
      attrs.garnish ??
      "";

    const notes =
      attrs.noter ??
      attrs.notes ??
      "";

    const carbonationHours =
      attrs.karbonering?.tid_timer ??
      attrs.karboneringstid_timer ??
      attrs.carbonation_hours ??
      null;

    const hasRecipe =
      ingredients.length > 0 ||
      Boolean(method) ||
      Boolean(garnish) ||
      Boolean(notes) ||
      carbonationHours !== null;

    const status = statusEntity?.state ?? "idle";
    const statusUi = this._statusPresentation(status);
    const progress = Math.max(0, Math.min(100, this._number(progressEntity?.state)));
    const remaining = remainingEntity?.state ?? "Ikke startet";
    const finishedText = this._formatTimestamp(finishedEntity);
    const timeOnTapText = this._formatTimestamp(timeOnTapEntity);
    const shelfLifeUi = this._shelfLifePresentation(
      shelfLife,
      timeOnTapEntity
    );

    const cocktailOptions = cocktailSelect?.attributes?.options ?? [];

    // The tap sensor is the authoritative displayed cocktail. Using it here
    // keeps the dropdown in sync even while Home Assistant is updating the
    // select entity after a coordinator refresh.
    const selectedCocktail =
      cocktailEntity?.state ??
      cocktailSelect?.state ??
      "";

    const options = carbonationSelect?.attributes?.options ?? [];
    const selected = carbonationSelect?.state ?? "";
    const startDisabled = !startButton || startButton.state === "unavailable";
    const stopDisabled = !stopButton || stopButton.state === "unavailable";

    const co2Value = Math.max(2.0, Math.min(3.0, this._number(co2, 2.0)));
    const bubbleLevel = Math.max(0, Math.min(1, (co2Value - 2.0) / 1.0));
    const bubbleCount = Math.round(18 + bubbleLevel * 26);
    const bubbleScale = (1.05 + bubbleLevel * 0.40).toFixed(2);
    const bubbleBaseDuration = 4.0 - bubbleLevel * 2.2;

    const bubbles = Array.from({ length: bubbleCount }, (_, index) => {
      const left = (index * 17 + 7) % 100;
      const size = 10 + ((index * 5) % 18);
      const speed = Math.max(
        1.2,
        bubbleBaseDuration + (((index * 7) % 9) - 4) * 0.12
      ).toFixed(2);
      const delay = -((index * 0.63) % 5).toFixed(2);

      return `<span class="bubble" style="left:${left}%;--size:${size}px;--speed:${speed}s;--delay:${delay}s"></span>`;
    }).join("");

    const cocktailOptionHtml = this._buildCocktailOptionHtml(
      cocktailOptions,
      selectedCocktail,
      libraryEntity
    );

    const optionHtml = options.length
      ? options.map((option) => `<option value="${this._escape(option)}" ${option === selected ? "selected" : ""}>${this._escape(option)}</option>`).join("")
      : "<option>Ingen valgmuligheder</option>";

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card {
          --cocktail-color:${this._escape(color)};
          position:relative;
          overflow:hidden;
          border-radius:28px;
          padding:22px;
          color:var(--primary-text-color);
          background:
            radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--cocktail-color) 34%, transparent), transparent 38%),
            linear-gradient(145deg, color-mix(in srgb, var(--card-background-color) 86%, var(--cocktail-color)), var(--card-background-color));
        }
        .content { position:relative; z-index:1; }
        .bubbles {
          position:absolute;
          inset:0;
          overflow:hidden;
          pointer-events:none;
          transform:scale(${bubbleScale});
          transform-origin:center;
        }
        .bubble {
          position:absolute;
          bottom:-24px;
          width:var(--size);
          height:var(--size);
          border:1.5px solid rgba(15,15,20,0.55);
          background:
            radial-gradient(circle at 35% 30%,
              rgba(255,255,255,0.98) 0%,
              rgba(255,255,255,0.75) 45%,
              rgba(255,255,255,0.32) 100%);
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.45),
            0 0 9px rgba(255,255,255,0.7);
          border-radius:50%;
          animation:rise var(--speed) linear infinite;
          animation-delay:var(--delay);
        }
        .bubble::after {
          content:"";
          position:absolute;
          top:16%;
          left:20%;
          width:26%;
          height:26%;
          border-radius:50%;
          background:rgba(255,255,255,0.98);
          box-shadow:0 0 5px rgba(255,255,255,0.95);
        }
        @media (prefers-reduced-motion: reduce) {
          .bubble {
            animation:none;
            opacity:.8;
            bottom:20%;
          }
        }

        @keyframes rise {
          from {
            bottom:-32px;
            transform:scale(.8);
            opacity:0;
          }
          15% { opacity:.7; }
          85% { opacity:.7; }
          to {
            bottom:calc(100% + 32px);
            transform:scale(1.15);
            opacity:0;
          }
        }
        .top { display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:14px; }
        .cocktail-icon {
          display:grid;
          place-items:center;
          width:68px;
          height:68px;
          border-radius:22px;
          font-size:42px;
          background:color-mix(in srgb, var(--cocktail-color) 24%, transparent);
          border:1px solid color-mix(in srgb, var(--cocktail-color) 45%, transparent);
        }
        .title { min-width:0; }
        .tap-name { font-size:13px; opacity:.7; margin-bottom:3px; }
        .cocktail-name {
          overflow:hidden;
          display:-webkit-box;
          -webkit-box-orient:vertical;
          -webkit-line-clamp:2;
          line-clamp:2;
          white-space:normal;
          word-break:break-word;
          font-size:${cocktailFontSize};
          font-weight:700;
          line-height:1.08;
          max-width:100%;
        }
        .status { display:inline-flex; align-items:center; gap:6px; padding:7px 10px; border-radius:999px; font-size:12px; font-weight:700; white-space:nowrap; }
        .status.idle { background:color-mix(in srgb, var(--secondary-text-color) 15%, transparent); }
        .status.carbonating { background:color-mix(in srgb, #f2b544 26%, transparent); }
        .status.ready { background:color-mix(in srgb, #55c979 26%, transparent); }
        .cocktail-picker { margin-top:16px; }
        .cocktail-picker label {
          display:block;
          margin:0 0 7px 2px;
          font-size:13px;
          font-weight:700;
          opacity:.78;
        }
        .details { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
        .detail { padding:7px 10px; border-radius:12px; font-size:13px; background:color-mix(in srgb, var(--primary-text-color) 7%, transparent); }
        .progress-section { margin-top:20px; }
        .progress-header { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:8px; }
        .progress-label,.progress-value { font-size:14px; font-weight:700; }
        .progress-track { height:12px; overflow:hidden; border-radius:999px; background:color-mix(in srgb, var(--primary-text-color) 12%, transparent); }
        .progress-bar { height:100%; width:${progress}%; border-radius:inherit; background:linear-gradient(90deg, color-mix(in srgb, var(--cocktail-color) 78%, white), var(--cocktail-color)); transition:width 300ms ease; }
        .time-row { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 16px; margin-top:10px; font-size:13px; opacity:.84; }

        .ready-section {
          margin-top:8px;
          padding:16px;
          border-radius:18px;
          background:
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--cocktail-color) 28%, white),
              color-mix(in srgb, var(--card-background-color) 88%, white)
            );
          border:1px solid color-mix(in srgb, var(--cocktail-color) 38%, transparent);
        }
        .ready-badge {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:999px;
          font-size:13px;
          font-weight:800;
          color:var(--primary-text-color);
          background:color-mix(in srgb, var(--cocktail-color) 18%, white);
        }
        .ready-badge ha-icon {
          --mdc-icon-size:18px;
          color:color-mix(in srgb, var(--cocktail-color) 68%, black);
        }
        .ready-time {
          margin-top:12px;
          font-size:24px;
          font-weight:800;
          line-height:1.15;
          text-align:center;
          color:var(--primary-text-color);
        }
        .ready-subtext {
          margin-top:6px;
          font-size:13px;
          text-align:center;
          color:var(--secondary-text-color);
        }
        .shelf-life {
          margin-top:12px;
          padding:10px 12px;
          border-radius:12px;
          text-align:center;
          font-size:13px;
          font-weight:800;
        }
        .shelf-life.fresh {
          color:#155724;
          background:#d4edda;
        }
        .shelf-life.warning {
          color:#7a4b00;
          background:#fff3cd;
        }
        .shelf-life.expired {
          color:#842029;
          background:#f8d7da;
        }
        .shelf-life-detail {
          margin-top:3px;
          font-size:11px;
          font-weight:600;
          opacity:.78;
        }
        .controls { display:grid; grid-template-columns:minmax(0,1fr) auto auto; gap:10px; margin-top:20px; }
        select,button { min-height:42px; border:0; border-radius:13px; font:inherit; }
        select { width:100%; padding:0 12px; color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color) 9%, transparent); }
        button { display:inline-flex; align-items:center; justify-content:center; gap:7px; padding:0 15px; cursor:pointer; color:var(--text-primary-color,white); font-weight:700; background:var(--cocktail-color); }
        button.stop { color:var(--primary-text-color); background:color-mix(in srgb, var(--primary-text-color) 12%, transparent); }
        button:disabled { cursor:not-allowed; opacity:.4; }
        .message { padding:22px; }

        .serving-tips {
          margin-top:20px;
          padding:18px;
          border-radius:18px;
          text-align:center;
          background:
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--cocktail-color) 22%, transparent),
              color-mix(in srgb, var(--card-background-color) 88%, white)
            );
          border:1px solid color-mix(in srgb, var(--cocktail-color) 35%, transparent);
        }

        .serving-tips-title {
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          margin-bottom:10px;
          font-size:18px;
          font-weight:800;
        }

        .serving-tips-text {
          font-size:15px;
          line-height:1.5;
          white-space:pre-line;
          color:var(--primary-text-color);
        }

        .recipe-action {
          margin-top:16px;
        }

        .recipe-button {
          width:100%;
          min-height:44px;
          border-radius:14px;
          background:color-mix(in srgb, var(--cocktail-color) 24%, var(--card-background-color));
          color:var(--primary-text-color);
          border:1px solid color-mix(in srgb, var(--cocktail-color) 42%, transparent);
          font-weight:800;
        }

        .recipe-dialog {
          width:min(760px, calc(100vw - 32px));
          max-height:min(82vh, 820px);
          padding:0;
          overflow:auto;
          border:0;
          border-radius:24px;
          background:var(--card-background-color);
          color:var(--primary-text-color);
          box-shadow:0 24px 80px rgba(0,0,0,.35);
        }

        .recipe-dialog::backdrop {
          background:rgba(0,0,0,.58);
          backdrop-filter:blur(4px);
        }

        .recipe-sheet {
          padding:22px;
        }

        .recipe-header {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
        }

        .recipe-kicker {
          font-size:13px;
          font-weight:800;
          opacity:.7;
        }

        .recipe-title {
          margin-top:3px;
          font-size:24px;
          font-weight:900;
        }

        .recipe-close {
          width:42px;
          min-width:42px;
          padding:0;
          color:var(--primary-text-color);
          background:color-mix(in srgb, var(--primary-text-color) 10%, transparent);
        }

        .recipe-table-wrap {
          overflow:auto;
          border-radius:16px;
          border:1px solid var(--divider-color);
        }

        .recipe-table {
          width:100%;
          border-collapse:collapse;
          min-width:560px;
        }

        .recipe-table th,
        .recipe-table td {
          padding:12px 14px;
          text-align:left;
          border-bottom:1px solid var(--divider-color);
        }

        .recipe-table th {
          font-size:12px;
          text-transform:uppercase;
          letter-spacing:.04em;
          opacity:.7;
          background:color-mix(in srgb, var(--cocktail-color) 12%, transparent);
        }

        .recipe-table td:first-child {
          font-weight:800;
        }

        .recipe-block {
          margin-top:16px;
          padding:16px;
          border-radius:16px;
          background:color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        }

        .recipe-block-title {
          margin-bottom:6px;
          font-size:13px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:.03em;
          opacity:.7;
        }

        .recipe-block-text {
          white-space:pre-line;
          line-height:1.5;
        }

        .recipe-toolbar {
          display:grid;
          grid-template-columns:minmax(0,1fr) auto auto;
          gap:10px;
          margin-bottom:16px;
        }

        .recipe-amount-field {
          display:grid;
          gap:6px;
          font-size:13px;
          font-weight:700;
        }

        .recipe-tool-button {
          align-self:end;
          min-height:42px;
          color:var(--primary-text-color);
          background:color-mix(in srgb, var(--primary-text-color) 10%, transparent);
        }

        .recipe-empty {
          padding:18px;
          border-radius:16px;
          text-align:center;
          color:var(--secondary-text-color);
          background:color-mix(in srgb, var(--primary-text-color) 6%, transparent);
        }

        .recipe-sheet.large-text {
          font-size:18px;
        }

        .recipe-sheet.large-text .recipe-title {
          font-size:30px;
        }

        .recipe-sheet.large-text .recipe-table th,
        .recipe-sheet.large-text .recipe-table td {
          padding:16px;
          font-size:18px;
        }

        @media (max-width:600px) {
          .recipe-toolbar {
            grid-template-columns:1fr 1fr;
          }

          .recipe-amount-field {
            grid-column:1/-1;
          }

          .recipe-table {
            min-width:0;
          }
        }

        ha-card.compact {
          min-height:300px;
          box-sizing:border-box;
          padding:20px;
          border-radius:30px;
          color:#111111;
          background:
            linear-gradient(
              135deg,
              var(--cocktail-color),
              rgba(255,255,255,0.25)
            );
        }

        .compact-content {
          position:relative;
          z-index:1;
          min-height:260px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          text-align:center;
        }

        .compact-emoji {
          font-size:72px;
          line-height:1;
          margin-top:4px;
        }

        .compact-name {
          max-width:90%;
          margin-top:10px;
          color:#111111;
          font-size:${cocktailFontSize};
          font-weight:800;
          line-height:1.08;
          text-transform:uppercase;
          overflow-wrap:anywhere;
        }

        .compact-info {
          display:flex;
          flex-wrap:wrap;
          justify-content:center;
          align-items:center;
          gap:8px 14px;
          margin-top:22px;
          color:#111111;
          font-size:18px;
          line-height:1.4;
        }

        .compact-glass {
          margin-top:12px;
          color:#111111;
          font-size:20px;
          font-weight:600;
          opacity:.95;
        }
        ha-card.compact .cocktail-icon {
          width:54px;
          height:54px;
          border-radius:18px;
          font-size:34px;
        }
        ha-card.compact .cocktail-name {
          font-size:min(${cocktailFontSize}, 21px);
        }
        ha-card.compact .cocktail-picker,
        ha-card.compact .details,
        ha-card.compact .progress-section,
        ha-card.compact .controls {
          margin-top:12px;
        }
        ha-card.compact .detail {
          padding:6px 9px;
          font-size:12px;
        }
        ha-card.compact select,
        ha-card.compact button {
          min-height:38px;
        }

        @media (max-width:480px) {
          .top { grid-template-columns:auto 1fr; }
          .status { grid-column:1/-1; justify-self:start; }
          .controls { grid-template-columns:1fr 1fr; }
          .controls select { grid-column:1/-1; }
        }
      </style>

      <ha-card class="${this._config.compact ? "compact" : ""}">
        ${this._config.show_bubbles ? `<div class="bubbles" aria-hidden="true">${bubbles}</div>` : ""}

        ${this._config.compact ? `
          <div class="compact-content">
            <div class="compact-emoji">${this._escape(icon)}</div>

            <div class="compact-name">
              ${this._escape(compactCocktailName)}
            </div>

            ${this._config.show_details ? `
              <div class="compact-info">
                ${abv !== undefined ? `<span>🥃 ${this._escape(abv)} %</span>` : ""}
                ${co2 !== undefined ? `<span>💨 ${this._escape(co2)} vol</span>` : ""}
                ${temperature !== undefined ? `<span>🌡️ ${this._escape(temperature)} °C</span>` : ""}
              </div>` : ""}

            ${this._config.show_glass && glass
              ? `<div class="compact-glass">🍸 ${this._escape(glass)}</div>`
              : ""}
          </div>
        ` : `
          <div class="content">
            <div class="top">
              <div class="cocktail-icon">${this._escape(icon)}</div>
              <div class="title">
                ${this._config.show_tap_name ? `<div class="tap-name">${this._escape(this._config.name)}</div>` : ""}
                <div class="cocktail-name">${this._escape(cocktailName)}</div>
              </div>
              ${this._config.show_status ? `
                <div class="status ${statusUi.css}">
                  <ha-icon icon="${statusUi.icon}"></ha-icon>
                  ${this._escape(statusUi.label)}
                </div>` : ""}
            </div>

            ${this._config.show_cocktail_select ? `
              <div class="cocktail-picker">
                <label for="cocktail-select">Vælg cocktail</label>
                <select id="cocktail-select" ${cocktailSelect ? "" : "disabled"}>
                  ${cocktailOptionHtml}
                </select>
              </div>` : ""}

            ${this._config.show_details ? `
              <div class="details">
                ${abv !== undefined ? `<div class="detail">🥃 ${this._escape(abv)} % ABV</div>` : ""}
                ${co2 !== undefined ? `<div class="detail">💨 ${this._escape(co2)} vol CO₂</div>` : ""}
                ${temperature !== undefined ? `<div class="detail">🌡️ ${this._escape(temperature)} °C</div>` : ""}
                ${this._config.show_glass && glass ? `<div class="detail">🍸 ${this._escape(glass)}</div>` : ""}
              </div>` : ""}

            ${this._config.show_progress ? `
              <div class="progress-section">
                ${status === "ready"
                  ? `
                    <div class="ready-section">
                      <div class="ready-badge">
                        <ha-icon icon="mdi:check-circle"></ha-icon>
                        <span>Klar til servering</span>
                      </div>
                      <div class="ready-time">
                        ${this._config.show_time_on_tap && timeOnTapText
                          ? this._escape(timeOnTapText)
                          : "Klar nu"}
                      </div>
                      <div class="ready-subtext">Tid på fad</div>
                      ${this._config.show_shelf_life && shelfLifeUi
                        ? `<div class="shelf-life ${shelfLifeUi.css}">
                            <div>${this._escape(shelfLifeUi.label)}</div>
                            <div class="shelf-life-detail">${this._escape(shelfLifeUi.detail)}</div>
                          </div>`
                        : ""}
                    </div>
                  `
                  : `
                    <div class="progress-header">
                      <span class="progress-label">Karbonering</span>
                      <span class="progress-value">${progress.toFixed(1)} %</span>
                    </div>
                    <div class="progress-track"><div class="progress-bar"></div></div>
                    <div class="time-row">
                      <span>⏱️ ${this._escape(remaining)}</span>
                      ${status === "carbonating" && finishedText ? `<span>Færdig ${this._escape(finishedText)}</span>` : ""}
                    </div>
                  `}
              </div>` : ""}

            ${this._config.show_controls ? `
              <div class="controls">
                <select id="carbonation-select" ${carbonationSelect ? "" : "disabled"}>${optionHtml}</select>
                <button id="start-button" ${startDisabled ? "disabled" : ""}>
                  <ha-icon icon="mdi:play"></ha-icon>Start
                </button>
                <button id="stop-button" class="stop" ${stopDisabled ? "disabled" : ""}>
                  <ha-icon icon="mdi:stop"></ha-icon>Stop
                </button>
              </div>` : ""}

            ${this._config.show_serving_tips ? `
              <div class="serving-tips">
                <div class="serving-tips-title">
                  <span>🍹</span>
                  <span>Serveringstips</span>
                </div>
                <div class="serving-tips-text">
                  ${this._escape(servingTips)}
                </div>
              </div>` : ""}

            ${
              this._config.show_recipe && hasRecipe
                ? this._config.recipe_mode === "inline"
                  ? this._recipeHtml({
                      ingredients,
                      method,
                      garnish,
                      notes,
                      carbonationHours,
                      amountMode: this._config.recipe_amount,
                      largeText: this._config.recipe_large_text,
                    })
                  : `
                    <div class="recipe-action">
                      <button class="recipe-button" id="recipe-open">
                        <ha-icon icon="mdi:book-open-page-variant"></ha-icon>
                        Se opskrift
                      </button>
                    </div>
                  `
                : ""
            }

            <dialog class="recipe-dialog" id="recipe-dialog"></dialog>
          </div>
        `}
      </ha-card>
    `;

    const cocktailDropdown =
      this.shadowRoot?.querySelector("#cocktail-select");

    if (cocktailDropdown && selectedCocktail) {
      cocktailDropdown.value = selectedCocktail;
    }

    this._attachEventListeners(ids);

    if (
      this._config.show_recipe &&
      this._config.recipe_mode === "inline" &&
      hasRecipe
    ) {
      this._bindRecipeSheet(
        this.shadowRoot?.querySelector(".recipe-sheet"),
        attrs,
        null
      );
    }
  }

  _attachEventListeners(ids) {
    this.shadowRoot?.querySelector("#cocktail-select")?.addEventListener("change", (event) => {
      const entityId = this._state(ids.selection)
        ? ids.selection
        : ids.legacySelection;
      const domain = entityId.split(".", 1)[0];

      this._hass.callService(domain, "select_option", {
        entity_id: entityId,
        option: event.target.value,
      });
    });

    this.shadowRoot?.querySelector("#carbonation-select")?.addEventListener("change", (event) => {
      this._hass.callService("select", "select_option", {
        entity_id: ids.carbonationSelect,
        option: event.target.value,
      });
    });

    this.shadowRoot?.querySelector("#start-button")?.addEventListener("click", () => {
      this._hass.callService("button", "press", { entity_id: ids.startButton });
    });

    this.shadowRoot?.querySelector("#stop-button")?.addEventListener("click", () => {
      this._hass.callService("button", "press", { entity_id: ids.stopButton });
    });

    this.shadowRoot?.querySelector("#recipe-open")?.addEventListener("click", () => {
      const cocktailEntity = this._state(ids.cocktail);
      const libraryEntity = this._state(ids.library);
      const previewCocktail =
        this._config.preview_cocktail_id &&
        libraryEntity?.attributes?.cocktails?.[this._config.preview_cocktail_id];

      const attrs =
        previewCocktail && typeof previewCocktail === "object"
          ? previewCocktail
          : cocktailEntity?.attributes ?? {};

      const dialog = this.shadowRoot?.querySelector("#recipe-dialog");
      if (!dialog) return;

      dialog.innerHTML = this._recipeHtml({
        ...this._recipeDataFromAttributes(attrs),
        amountMode: this._config.recipe_amount,
        largeText: this._config.recipe_large_text,
      });

      this._bindRecipeSheet(
        dialog.querySelector(".recipe-sheet"),
        attrs,
        dialog
      );

      dialog.addEventListener(
        "click",
        (event) => {
          if (event.target === dialog) dialog.close();
        },
        { once: true }
      );

      dialog.showModal();
    });

    this.shadowRoot?.querySelector("#recipe-close")?.addEventListener("click", () => {
      this.shadowRoot.querySelector(".recipe-sheet")?.remove();
    });
  }
}


class TapCocktailCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._previewCocktailId = "";
  }

  set hass(hass) {
    this._hass = hass;

    // Home Assistant opdaterer hass meget ofte. Hvis hele editoren
    // renderes ved hver opdatering, lukker åbne dropdown-menuer.
    if (!this._editorRendered) {
      this._editorRendered = true;
      this._render();
      return;
    }

    // Opdater kun live-forhåndsvisningen uden at genopbygge editoren.
    const previewCard = this._value("preview-card");
    if (previewCard) {
      previewCard.hass = hass;
    }
  }

  setConfig(config) {
    this._config = {
      tap: 1,
      name: "Hane 1",
      show_cocktail_select: true,
      show_details: true,
      show_glass: true,
      show_bubbles: true,
      show_progress: true,
      show_controls: true,
      show_time_on_tap: true,
      show_shelf_life: true,
      show_serving_tips: true,
      show_recipe: true,
      show_status: true,
      show_tap_name: true,
      layout_preset: "custom",
      recipe_mode: "button",
      recipe_amount: "glass",
      recipe_large_text: false,
      compact: false,
      ...config,
    };
    this._editorRendered = true;
    this._render();
  }

  _value(id) {
    return this.shadowRoot?.getElementById(id);
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _displayIcon(icon, fallback = "🍹") {
    const value = String(icon ?? "").trim();
    if (!value) return fallback;
    return value;
  }

  _libraryCocktails() {
    const library = this._hass?.states?.["sensor.tapcocktail_library"];
    const cocktails = library?.attributes?.cocktails;

    return cocktails && typeof cocktails === "object"
      ? cocktails
      : {};
  }

  _previewOptions() {
    const cocktails = this._libraryCocktails();

    return Object.entries(cocktails)
      .sort(([, a], [, b]) =>
        String(a?.navn ?? "").localeCompare(String(b?.navn ?? ""), "da")
      )
      .map(([id, cocktail]) => {
        const icon = this._displayIcon(cocktail?.ikon);
        const name = cocktail?.navn ?? id;
        const selected = id === this._previewCocktailId ? "selected" : "";

        return `<option value="${this._escape(id)}" ${selected}>${this._escape(
          `${icon} ${name}`
        )}</option>`;
      })
      .join("");
  }

  _emitConfig(changes) {
    const config = {
      ...this._config,
      ...changes,
    };

    this._config = config;

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const tap = Number(this._config.tap ?? 1);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display:block;
          padding:4px 0;
        }

        .editor {
          display:grid;
          gap:16px;
        }

        .section {
          display:grid;
          gap:10px;
          padding:14px;
          border:1px solid var(--divider-color);
          border-radius:14px;
          background:var(--card-background-color);
        }

        .section-title {
          font-size:14px;
          font-weight:700;
        }

        label.field {
          display:grid;
          gap:6px;
          font-size:13px;
        }

        select,
        input[type="text"] {
          box-sizing:border-box;
          width:100%;
          min-height:42px;
          padding:0 12px;
          color:var(--primary-text-color);
          background:var(--secondary-background-color);
          border:1px solid var(--divider-color);
          border-radius:10px;
          font:inherit;
        }

        label.toggle {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          min-height:34px;
          font-size:14px;
        }

        input[type="checkbox"] {
          width:20px;
          height:20px;
          accent-color:var(--primary-color);
        }

        .hint {
          color:var(--secondary-text-color);
          font-size:12px;
          line-height:1.4;
        }

        .preview-wrap {
          display:grid;
          gap:12px;
        }

        .preview-frame {
          padding:10px;
          border-radius:18px;
          background:var(--secondary-background-color);
          border:1px solid var(--divider-color);
        }

        .preview-frame tapcocktail-card {
          display:block;
        }
      </style>

      <div class="editor">
        <div class="section">
          <div class="section-title">Grundindstillinger</div>

          <label class="field">
            Hane
            <select id="tap">
              ${Array.from({ length: 8 }, (_, index) => {
                const tapNumber = index + 1;
                return `<option value="${tapNumber}" ${
                  tap === tapNumber ? "selected" : ""
                }>Hane ${tapNumber}</option>`;
              }).join("")}
            </select>
          </label>

          <label class="field">
            Kortets navn
            <input
              id="name"
              type="text"
              value="${String(this._config.name ?? `Hane ${tap}`)
                .replaceAll("&", "&amp;")
                .replaceAll('"', "&quot;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")}"
            />
          </label>
        </div>

        <div class="section">
          <div class="section-title">Kort-layout</div>
          <label class="field">
            Forudindstilling
            <select id="layout_preset">
              <option value="custom" ${this._config.layout_preset === "custom" ? "selected" : ""}>
                Brugerdefineret
              </option>
              <option value="full" ${this._config.layout_preset === "full" ? "selected" : ""}>
                Standard – alt vist
              </option>
              <option value="serving" ${this._config.layout_preset === "serving" ? "selected" : ""}>
                Servering
              </option>
              <option value="carbonation" ${this._config.layout_preset === "carbonation" ? "selected" : ""}>
                Karbonering
              </option>
              <option value="compact" ${this._config.layout_preset === "compact" ? "selected" : ""}>
                Kompakt
              </option>
              <option value="minimal" ${this._config.layout_preset === "minimal" ? "selected" : ""}>
                Minimal
              </option>
            </select>
          </label>
          <div class="hint">Vælg et layout og tilpas bagefter de enkelte visningsvalg.</div>
        </div>

        <div class="section">
          <div class="section-title">Visning</div>

          ${this._toggle("show_tap_name", "Vis hanens navn")}
          ${this._toggle("show_status", "Vis status")}
          ${this._toggle("show_cocktail_select", "Vis cocktailvælger")}
          ${this._toggle("show_details", "Vis ABV, CO₂ og temperatur")}
          ${this._toggle("show_glass", "Vis glastype")}
          ${this._toggle("show_bubbles", "Vis CO₂-bobler")}
          ${this._toggle("show_progress", "Vis karboneringsstatus")}
          ${this._toggle("show_controls", "Vis start, stop og tidsvalg")}
          ${this._toggle("show_time_on_tap", "Vis tid på fad")}
          ${this._toggle("show_shelf_life", "Vis holdbarhed på fad")}
          ${this._toggle("show_serving_tips", "Vis serveringstips")}
          ${this._toggle("show_recipe", "Vis opskrift")}

          <label class="field">
            Opskriftsvisning
            <select id="recipe_mode">
              <option value="button" ${this._config.recipe_mode === "button" ? "selected" : ""}>
                Knap: Se opskrift
              </option>
              <option value="inline" ${this._config.recipe_mode === "inline" ? "selected" : ""}>
                Vis direkte på kortet
              </option>
            </select>
          </label>

          <label class="field">
            Standardmængde i opskrift
            <select id="recipe_amount">
              <option value="glass" ${this._config.recipe_amount === "glass" ? "selected" : ""}>Pr. glas</option>
              <option value="two_liter" ${this._config.recipe_amount === "two_liter" ? "selected" : ""}>2 liter</option>
              <option value="nine_liter" ${this._config.recipe_amount === "nine_liter" ? "selected" : ""}>9 liter</option>
            </select>
          </label>

          ${this._toggle("recipe_large_text", "Stor tekst i opskrift")}
          ${this._toggle("compact", "Kompakt visning")}
        </div>

        <div class="section preview-wrap">
          <div class="section-title">Live-forhåndsvisning</div>

          <label class="field">
            Cocktail i forhåndsvisning
            <select id="preview-cocktail">
              <option value="">Brug cocktailen på den valgte hane</option>
              ${this._previewOptions()}
            </select>
          </label>

          <div class="preview-frame">
            <tapcocktail-card id="preview-card"></tapcocktail-card>
          </div>
        </div>

        <div class="hint">
          Ændringer vises straks i forhåndsvisningen.
        </div>
      </div>
    `;

    const previewCard = this._value("preview-card");

    if (previewCard && this._hass) {
      previewCard.setConfig({
        ...this._config,
        preview_cocktail_id: this._previewCocktailId || null,
      });
      previewCard.hass = this._hass;
    }

    this._bindEvents();
  }

  _toggle(key, label) {
    return `
      <label class="toggle">
        <span>${label}</span>
        <input
          id="${key}"
          type="checkbox"
          ${this._config[key] !== false && (key !== "compact" || this._config[key] === true) ? "checked" : ""}
        />
      </label>
    `;
  }

  _bindEvents() {
    this._value("preview-cocktail")?.addEventListener("change", (event) => {
      this._previewCocktailId = event.target.value;
      this._render();
    });

    this._value("tap")?.addEventListener("change", (event) => {
      const tap = Number(event.target.value);
      const oldDefaultName = `Hane ${this._config.tap ?? 1}`;
      const newDefaultName = `Hane ${tap}`;
      const currentName = this._config.name ?? oldDefaultName;

      this._emitConfig({
        tap,
        name: currentName === oldDefaultName ? newDefaultName : currentName,
      });

      this._render();
    });

    this._value("name")?.addEventListener("input", (event) => {
      this._emitConfig({ name: event.target.value });
    });

    this._value("layout_preset")?.addEventListener("change", (event) => {
      const presets = {
        full: {compact:false,show_tap_name:true,show_status:true,show_cocktail_select:true,show_details:true,show_glass:true,show_bubbles:true,show_progress:true,show_controls:true,show_time_on_tap:true,show_shelf_life:true,show_serving_tips:true,show_recipe:true},
        serving: {compact:false,show_tap_name:true,show_status:true,show_cocktail_select:true,show_details:true,show_glass:true,show_bubbles:true,show_progress:false,show_controls:false,show_time_on_tap:false,show_serving_tips:true,show_recipe:true},
        carbonation: {compact:false,show_tap_name:true,show_status:true,show_cocktail_select:true,show_details:true,show_glass:true,show_bubbles:true,show_progress:true,show_controls:true,show_time_on_tap:true,show_serving_tips:false,show_recipe:false},
        compact: {compact:true,show_tap_name:false,show_status:false,show_cocktail_select:false,show_details:true,show_glass:true,show_bubbles:true,show_progress:false,show_controls:false,show_time_on_tap:false,show_serving_tips:false,show_recipe:false},
        minimal: {compact:false,show_tap_name:true,show_status:true,show_cocktail_select:false,show_details:false,show_glass:false,show_bubbles:false,show_progress:false,show_controls:false,show_time_on_tap:false,show_serving_tips:false,show_recipe:false},
      };
      const presetName = event.target.value;
      const preset = presets[presetName];

      if (!preset) {
        this._emitConfig({ layout_preset: "custom" });
        return;
      }

      this._emitConfig({
        layout_preset: presetName,
        ...preset,
      });
      this._render();
    });

    this._value("recipe_mode")?.addEventListener("change", (event) => {
      this._emitConfig({
        layout_preset: "custom",
        recipe_mode: event.target.value,
      });
      this._render();
    });

    this._value("recipe_amount")?.addEventListener("change", (event) => {
      this._emitConfig({
        layout_preset: "custom",
        recipe_amount: event.target.value,
      });
      this._render();
    });

    [
      "show_tap_name",
      "show_status",
      "show_cocktail_select",
      "show_details",
      "show_glass",
      "show_bubbles",
      "show_progress",
      "show_controls",
      "show_time_on_tap",
      "show_shelf_life",
      "show_serving_tips",
      "show_recipe",
      "recipe_large_text",
      "compact",
    ].forEach((key) => {
      this._value(key)?.addEventListener("change", (event) => {
        this._emitConfig({
          layout_preset: "custom",
          [key]: event.target.checked,
        });
      });
    });
  }
}

if (!customElements.get("tapcocktail-card-editor")) {
  customElements.define("tapcocktail-card-editor", TapCocktailCardEditor);
}

if (!customElements.get("tapcocktail-card")) {
  customElements.define("tapcocktail-card", TapCocktailCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tapcocktail-card",
  name: "TapCocktail Card",
  description: "Cocktailhane med layout-presets, opskrift, karbonering og live-forhåndsvisning.",
  preview: true,
});
