/** TapCocktail Card v1.5.0 - CO2 pressure plan */
import "./tapcocktail-card-core.js";

const Card = customElements.get("tapcocktail-card");
const Editor = customElements.get("tapcocktail-card-editor");
const invalid = new Set(["", "unknown", "unavailable", "none"]);

if (Card && !Card.__pressurePlan) {
  Card.__pressurePlan = true;
  const p = Card.prototype;
  const oldConfig = p.setConfig;
  const oldIds = p._entityIds;
  const oldRender = p._render;
  const oldStub = Card.getStubConfig?.bind(Card);

  p.setConfig = function (config) {
    return oldConfig.call(this, { show_pressure_plan: true, ...config });
  };

  p._entityIds = function () {
    const ids = oldIds.call(this);
    const tap = this._config?.tap ?? 1;
    return {
      ...ids,
      carbonationPressure: `sensor.hane_${tap}_karboneringstryk`,
      coolingPressure: `sensor.hane_${tap}_koletryk`,
      servingPressure: `sensor.hane_${tap}_serveringstryk`,
    };
  };

  p._pressureValue = function (value, digits) {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString("da-DK", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
      : null;
  };

  p._pressureData = function (entity) {
    const attrs = entity?.attributes ?? {};
    const state = String(entity?.state ?? "").toLowerCase();
    const bar = this._pressureValue(entity?.state, 2);
    return {
      ready:
        Boolean(entity) &&
        !invalid.has(state) &&
        bar !== null &&
        attrs.status !== "mangler_karboneringsrum_temperatur",
      bar,
      psi: this._pressureValue(attrs.psi, 1),
      temp: this._pressureValue(attrs.temperatur, 1),
      source: String(attrs.temperatur_kilde ?? ""),
    };
  };

  p._renderPressurePlan = function () {
    const root = this.shadowRoot;
    if (!root) return;
    root.querySelector(".tc-pressure-plan")?.remove();

    if (
      !this._hass ||
      !this._config ||
      this._config.compact ||
      this._config.show_pressure_plan === false
    ) return;

    const ids = this._entityIds();
    const cocktail = this._state(ids.cocktail);
    const cocktailState = String(cocktail?.state ?? "").toLowerCase();
    if (!cocktail || invalid.has(cocktailState) || cocktailState === "ingen") return;

    const carbonation = this._pressureData(this._state(ids.carbonationPressure));
    const cooling = this._pressureData(this._state(ids.coolingPressure));
    const serving = this._pressureData(this._state(ids.servingPressure));
    const status = this._state(ids.status)?.state ?? "idle";
    const co2 = this._pressureValue(
      cocktail.attributes?.co2 ??
        cocktail.attributes?.vol_co2 ??
        this._state(ids.carbonationPressure)?.attributes?.vol_co2,
      1
    );

    if (!root.querySelector("style[data-tc-pressure]")) {
      const style = document.createElement("style");
      style.dataset.tcPressure = "";
      style.textContent = `
        .tc-pressure-plan{margin-top:18px;padding:16px;border-radius:18px;border:1px solid color-mix(in srgb,var(--cocktail-color) 36%,transparent);background:color-mix(in srgb,var(--cocktail-color) 12%,var(--card-background-color))}
        .tc-pressure-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.tc-pressure-kicker{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--secondary-text-color)}.tc-pressure-title{font-size:18px;font-weight:900;margin-top:3px}.tc-pressure-target{padding:6px 9px;border-radius:999px;font-size:12px;font-weight:800;background:color-mix(in srgb,var(--cocktail-color) 22%,transparent);white-space:nowrap}
        .tc-pressure-warning{display:flex;gap:8px;padding:10px;margin-bottom:10px;border-radius:12px;background:#fff3cd;color:#6b4500;font-size:12px;line-height:1.35}.tc-pressure-warning ha-icon{--mdc-icon-size:18px;flex:0 0 auto}
        .tc-pressure-steps{display:grid;gap:8px}.tc-pressure-step{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:11px;border-radius:14px;background:color-mix(in srgb,var(--primary-text-color) 6%,transparent);border:1px solid transparent}.tc-pressure-step.active{border-color:color-mix(in srgb,var(--cocktail-color) 62%,transparent);background:color-mix(in srgb,var(--cocktail-color) 18%,transparent)}
        .tc-pressure-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:color-mix(in srgb,var(--cocktail-color) 24%,transparent)}.tc-pressure-icon ha-icon{--mdc-icon-size:21px}.tc-pressure-name{font-size:14px;font-weight:900}.tc-pressure-meta,.tc-pressure-sub,.tc-pressure-note,.tc-pressure-arrow{font-size:11px;color:var(--secondary-text-color)}.tc-pressure-meta{margin-top:2px}.tc-pressure-value{text-align:right;white-space:nowrap}.tc-pressure-value strong{display:block;font-size:15px}.tc-pressure-arrow{display:flex;align-items:center;gap:6px;padding-left:13px}.tc-pressure-arrow ha-icon{--mdc-icon-size:14px}.tc-pressure-note{margin-top:11px;line-height:1.4}
        @media(max-width:480px){.tc-pressure-step{grid-template-columns:36px minmax(0,1fr)}.tc-pressure-value{grid-column:2;text-align:left}.tc-pressure-value strong,.tc-pressure-value span{display:inline}.tc-pressure-value span:before{content:" \\00b7 "}}
      `;
      root.append(style);
    }

    const sourceLabel = (source) => ({
      karboneringsrum: "F\u00e6lles rumf\u00f8ler",
      "opskriftens m\u00e5ltemperatur": "Opskriftens m\u00e5ltemperatur",
      "hanens temperatursensor": "Hanens temperaturf\u00f8ler",
    })[source] ?? source;

    const step = (name, icon, data, active, missing) => {
      const meta = data.ready
        ? `${data.temp ?? "-"} \u00b0C${data.source ? ` \u00b7 ${sourceLabel(data.source)}` : ""}`
        : missing;
      const value = data.ready
        ? `<strong>${data.bar} bar</strong><span class="tc-pressure-sub">${data.psi ?? "-"} psi</span>`
        : `<strong>-</strong><span class="tc-pressure-sub">Kan ikke beregnes</span>`;
      return `<div class="tc-pressure-step ${active ? "active" : ""}"><div class="tc-pressure-icon"><ha-icon icon="${icon}"></ha-icon></div><div><div class="tc-pressure-name">${name}</div><div class="tc-pressure-meta">${this._escape(meta)}</div></div><div class="tc-pressure-value">${value}</div></div>`;
    };

    const section = document.createElement("section");
    section.className = "tc-pressure-plan";
    section.innerHTML = `
      <div class="tc-pressure-head"><div><div class="tc-pressure-kicker">CO\u2082-trykplan</div><div class="tc-pressure-title">Karbonering \u2192 k\u00f8l \u2192 servering</div></div>${co2 ? `<div class="tc-pressure-target">${co2} vol CO\u2082</div>` : ""}</div>
      ${carbonation.ready ? "" : `<div class="tc-pressure-warning"><ha-icon icon="mdi:alert-circle-outline"></ha-icon><span>V\u00e6lg den f\u00e6lles f\u00f8ler i <b>Karboneringsrum Temperatursensor</b>.</span></div>`}
      <div class="tc-pressure-steps">
        ${step("1. Karbonering", "mdi:gauge", carbonation, status === "carbonating", "Mangler f\u00e6lles rumtemperatur")}
        <div class="tc-pressure-arrow"><ha-icon icon="mdi:arrow-down"></ha-icon><span>S\u00e6nk regulatortrykket, n\u00e5r fadet s\u00e6ttes p\u00e5 k\u00f8l</span></div>
        ${step("2. Nedk\u00f8ling", "mdi:snowflake-thermometer", cooling, false, "Mangler cocktailens m\u00e5ltemperatur")}
        <div class="tc-pressure-arrow"><ha-icon icon="mdi:arrow-down"></ha-icon><span>Bevar balancetrykket under servering</span></div>
        ${step("3. Servering", "mdi:glass-cocktail", serving, status === "ready", "Mangler temperaturdata")}
      </div>
      <div class="tc-pressure-note">V\u00e6rdierne er regulatorens ligev\u00e6gtstryk. Brug flow control eller passende slangel\u00e6ngde til at styre h\u00e6ldehastigheden.</div>`;

    const anchor = root.querySelector(".details") ?? root.querySelector(".top");
    if (anchor) anchor.insertAdjacentElement("afterend", section);
    else root.querySelector(".content")?.append(section);
  };

  p._render = function (...args) {
    const result = oldRender.apply(this, args);
    this._renderPressurePlan();
    return result;
  };

  if (oldStub) Card.getStubConfig = () => ({ ...oldStub(), show_pressure_plan: true });
}

if (Editor && !Editor.__pressurePlan) {
  Editor.__pressurePlan = true;
  const p = Editor.prototype;
  const oldConfig = p.setConfig;
  const oldRender = p._render;
  const oldEmit = p._emitConfig;

  p.setConfig = function (config) {
    return oldConfig.call(this, { show_pressure_plan: true, ...config });
  };

  p._emitConfig = function (changes) {
    const presets = { full: true, serving: true, carbonation: true, compact: false, minimal: false };
    const preset = changes?.layout_preset;
    return oldEmit.call(this, {
      ...changes,
      ...(preset && preset !== "custom" && preset in presets
        ? { show_pressure_plan: presets[preset] }
        : {}),
    });
  };

  p._render = function (...args) {
    const result = oldRender.apply(this, args);
    const root = this.shadowRoot;
    if (!root || root.getElementById("show_pressure_plan")) return result;
    const section = [...root.querySelectorAll(".section")].find(
      (item) => item.querySelector(".section-title")?.textContent?.trim() === "Visning"
    );
    if (!section) return result;
    const label = document.createElement("label");
    label.className = "toggle";
    label.innerHTML = `<span>Vis CO\u2082-trykplan</span><input id="show_pressure_plan" type="checkbox" ${this._config.show_pressure_plan !== false ? "checked" : ""}/>`;
    const before = section.querySelector("#recipe_mode")?.closest("label");
    if (before) section.insertBefore(label, before); else section.append(label);
    label.querySelector("input")?.addEventListener("change", (event) => {
      this._emitConfig({ layout_preset: "custom", show_pressure_plan: event.target.checked });
      this._render();
    });
    return result;
  };
}

const registration = window.customCards?.find((item) => item.type === "tapcocktail-card");
if (registration) registration.description = "TapCocktail med opskrift, live temperatur og automatisk CO2-trykplan.";
console.info("TapCocktail Card v1.5.0 - CO2 pressure plan active");
