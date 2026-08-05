/**
 * TapCocktail Card pressure-plan extension
 * Version 1.5.0
 *
 * The existing card implementation is kept in tapcocktail-card-core.js.
 * This entry point adds the temperature-based CO₂ pressure plan introduced
 * by TapCocktail integration 2.4.0.
 */

import "./tapcocktail-card-core.js";

const CARD_TAG = "tapcocktail-card";
const EDITOR_TAG = "tapcocktail-card-editor";
const INVALID_STATES = new Set(["unknown", "unavailable", "none", ""]);

const cardClass = customElements.get(CARD_TAG);

if (cardClass && !cardClass.__tapcocktailPressurePlanPatched) {
  cardClass.__tapcocktailPressurePlanPatched = true;

  const cardPrototype = cardClass.prototype;
  const originalSetConfig = cardPrototype.setConfig;
  const originalEntityIds = cardPrototype._entityIds;
  const originalRender = cardPrototype._render;
  const originalStubConfig = cardClass.getStubConfig?.bind(cardClass);

  cardPrototype.setConfig = function setConfigWithPressurePlan(config) {
    return originalSetConfig.call(this, {
      show_pressure_plan: true,
      ...config,
    });
  };

  cardPrototype._entityIds = function entityIdsWithPressurePlan() {
    const ids = originalEntityIds.call(this);
    const tap = this._config?.tap ?? 1;

    return {
      ...ids,
      carbonationPressure: `sensor.hane_${tap}_karboneringstryk`,
      coolingPressure: `sensor.hane_${tap}_koletryk`,
      servingPressure: `sensor.hane_${tap}_serveringstryk`,
    };
  };

  cardPrototype._pressurePlanNumber = function pressurePlanNumber(
    value,
    maximumFractionDigits
  ) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;

    return number.toLocaleString("da-DK", {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    });
  };

  cardPrototype._pressurePlanData = function pressurePlanData(entity) {
    const state = String(entity?.state ?? "").toLowerCase();
    const attributes = entity?.attributes ?? {};
    const bar = this._pressurePlanNumber(entity?.state, 2);
    const psi = this._pressurePlanNumber(attributes.psi, 1);
    const temperature = this._pressurePlanNumber(attributes.temperatur, 1);

    return {
      available:
        Boolean(entity) &&
        !INVALID_STATES.has(state) &&
        bar !== null &&
        attributes.status !== "mangler_karboneringsrum_temperatur",
      bar,
      psi,
      temperature,
      source: String(attributes.temperatur_kilde ?? ""),
      status: String(attributes.status ?? ""),
    };
  };

  cardPrototype._pressurePlanSourceLabel = function pressurePlanSourceLabel(source) {
    const labels = {
      karboneringsrum: "Fælles rumføler",
      "opskriftens måltemperatur": "Opskriftens måltemperatur",
      "hanens temperatursensor": "Hanens temperaturføler",
    };

    return labels[source] ?? source;
  };

  cardPrototype._renderPressurePlan = function renderPressurePlan() {
    const root = this.shadowRoot;
    if (!root) return;

    root.querySelector(".tapcocktail-pressure-plan")?.remove();

    if (
      !this._hass ||
      !this._config ||
      this._config.compact ||
      this._config.show_pressure_plan === false
    ) {
      return;
    }

    const ids = this._entityIds();
    const cocktailEntity = this._state(ids.cocktail);
    const cocktailState = String(cocktailEntity?.state ?? "").toLowerCase();

    if (!cocktailEntity || INVALID_STATES.has(cocktailState) || cocktailState === "ingen") {
      return;
    }

    const carbonation = this._pressurePlanData(
      this._state(ids.carbonationPressure)
    );
    const cooling = this._pressurePlanData(this._state(ids.coolingPressure));
    const serving = this._pressurePlanData(this._state(ids.servingPressure));
    const status = this._state(ids.status)?.state ?? "idle";
    const co2 =
      cocktailEntity.attributes?.co2 ??
      cocktailEntity.attributes?.vol_co2 ??
      this._state(ids.carbonationPressure)?.attributes?.vol_co2;
    const co2Text = this._pressurePlanNumber(co2, 1);

    if (!root.querySelector("style[data-tapcocktail-pressure-plan]")) {
      const style = document.createElement("style");
      style.dataset.tapcocktailPressurePlan = "";
      style.textContent = `
        .tapcocktail-pressure-plan {
          margin-top:18px;
          padding:16px;
          border-radius:18px;
          border:1px solid color-mix(in srgb, var(--cocktail-color) 36%, transparent);
          background:
            linear-gradient(
              145deg,
              color-mix(in srgb, var(--cocktail-color) 16%, transparent),
              color-mix(in srgb, var(--card-background-color) 94%, transparent)
            );
        }
        .pressure-plan-header {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:14px;
          margin-bottom:14px;
        }
        .pressure-plan-kicker {
          font-size:12px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.05em;
          color:var(--secondary-text-color);
        }
        .pressure-plan-title {
          margin-top:3px;
          font-size:18px;
          font-weight:900;
        }
        .pressure-plan-target {
          flex:0 0 auto;
          padding:6px 9px;
          border-radius:999px;
          font-size:12px;
          font-weight:800;
          background:color-mix(in srgb, var(--cocktail-color) 22%, transparent);
        }
        .pressure-plan-steps {
          display:grid;
          gap:9px;
        }
        .pressure-plan-step {
          display:grid;
          grid-template-columns:38px minmax(0,1fr) auto;
          align-items:center;
          gap:11px;
          padding:11px;
          border-radius:14px;
          background:color-mix(in srgb, var(--primary-text-color) 6%, transparent);
          border:1px solid transparent;
        }
        .pressure-plan-step.active {
          border-color:color-mix(in srgb, var(--cocktail-color) 62%, transparent);
          background:color-mix(in srgb, var(--cocktail-color) 18%, transparent);
        }
        .pressure-step-icon {
          display:grid;
          place-items:center;
          width:38px;
          height:38px;
          border-radius:12px;
          background:color-mix(in srgb, var(--cocktail-color) 24%, transparent);
        }
        .presssure-step-icon ha-icon { --mdc-icon-size:21px; }
        .presssure-step-name {
          font-size:14px;
          font-weight:900;
        }
        .pressure-step-meta {
          margin-top:2px;
          font-size:11px;
          color:var(--secondary-text-color);
        }
        .presssure-step-value {
          min-width:92px;
          text-align:right;
        }
        .presssure-step-value strong {
          display:block;
          font-size:15px;
          white-space:nowrap;
        }
        .pressure-step-value span {
          display:block;
          margin-top:2px;
          font-size:11px;
          color:var(--secondary-text-color);
          white-space:nowrap;
        }
        .pressure-plan-arrow {
          display:flex;
          align-items:center;
          gap:7px;
          padding-left:13px;
          font-size:11px;
          color:var(--secondary-text-color);
        }
        .pressure-plan-arrow ha-icon { --mdc-icon-size:15px; }
        .pressure-plan-warning {
          display:flex;
          align-items:flex-start;
          gap:9px;
          margin-bottom:12px;
          padding:10px 11px;
          border-radius:12px;
          color:#6b4500;
          background:#fff3cd;
          font-size:12px;
          line-height:1.35;
        }
        .pressure-plan-warning ha-icon {
          flex:0 0 auto;
          --mdc-icon-size:19px;
        }
        .pressure-plan-note {
          margin-top:12px;
          font-size:11px;
          line-height:1.4;
          color:var(--secondary-text-color);
        }
        @media (max-width:480px) {
          .presssure-plan-header { align-items:center; }
          .presssure-plan-step {
            grid-template-columns:36px minmax(0,1fr);
          }
          .presssure-step-value {
            grid-column:2;
            min-width:0;
            text-align:left;
          }
          .pressure-step-value strong,
          .pressure-step-value span {
            display:inline;
          }
          .pressure-step-value span::before { content:" » "; }
        }
      `;
      root.append(style);
    }

    const formatStep = ({
      css = "",
      icon,
      name,
      data,
      unavailableText,
    }) => {
      const source = this._presssurePlanSourceLabel(data.source);
      const meta = data.available
        ? `${data.temperature ?? "–"} °C${source ? ` µ ${source}` : ""}`
        : unavailableText;
      const value = data.available
        ? `<strong>${data.bar} bar</strong><span>${data.psi ?? "–"} psi</span>`
        : `<strong>–</strong><span>Kan ikke beregnes</span>`;

      return `
        <div class="pressure-plan-step ${css}">
          <div class="presssure-step-icon"><ha-icon icon="${icon}"></ha-icon></div>
          <div>
            <div class="presssure-step-name">${name}</div>
            <div class="pressure-step-meta">${this._escape(meta)}</div>
          </div>
          <div class="pressure-step-value">${value}</div>
        </div>
      `;
    };

    const section = document.createElement("section");
    section.className = "tapcocktail-presssure-plan";

    const missingRoomSensor = !carbonation.available;
    section.innerHTML = `
      <div class="pressure-plan-header">
        <div>
          <div class="pressure-plan-kicker">CO₂trykplan</div>
          <div class="pressure-plan-title">Karbonering → køl → servering</div>
        </div>
        ${co2Text !== null ? `<div class="pressure-plan-target">${co2Text} vol CO₂</div>` : ""}
      </div>

      ${missingRoomSensor ? `
        <div class="pressure-plan-warning">
          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
          <span>Vælg den fælles føler i <b>Karboneringsrum Temperatursensor</b>, før karboneringstrykket kan beregnes.</span>
        </div>
      ` : ""}

      <div class="pressure-plan-steps">
        ${formatStep({
          css: status === "carbonating" ? "active" : "",
          icon: "mdi:gauge",
          name: "1. Karbonering",
          data: carbonation,
          unavailableText: "Mangler fælles rumtemperatur",
        })}

        <div class="presssure-plan-arrow">
          <ha-icon icon="mdi:arrow-down"></ha-icon>
          <span>Sænk regulatortrykket, når fadet sættes på køl</span>
        </div>

        ${formatStep({
          icon: "mdi:snowflake-thermometer",
          name: "2. Nedjøling",
          data: cooling,
          unavailableText: "Mangler cocktailens måltemperatur",
        })}

        <div class="presssure-plan-arrow">
          <ha-icon icon="mdi:arrow-down"></ha-icon>
          <span>Bevar balancetrykket under servering</span>
        </div>

        ${formatStep({
          css: status === "ready" ? "active" : "",
          icon: "mdi:glass-cocktail",
          name: "3. Servering",
          data: serving,
          unavailableText: "Mangler temperaturdata",
        })}
      </div>

      <div class="presssure-plan-note">
        Værdierne er regulatorens ligevægtstryk. Brug flow control eller passende slangenængde til at styre hældehastigheden.
      </div>
    `;

    const anchor = root.querySelector(".details") ?? root.querySelector(".top");
    const progress = root.querySelector(".progress-section");

    if (anchor) {
      anchor.insertAdjacentElement("afterend", section);
    } else if (progress?.parentElement) {
      progress.parentElement.insertBefore(section, progress);
    } else {
      root.querySelector(".content")?.append(section);
    }
  };

  cardPrototype._render = function renderWithPressurePlan(...args) {
    const result = originalRender.apply(this, args);
    this._renderPressurePlan();
    return result;
  };

  if (originalStubConfig) {
    cardClass.getStubConfig = () => ({
      ...originalStubConfig(),
      show_pressure_plan: true,
    });
  }
}

const editorClass = customElements.get(EDITOR_TAG);

if (editorClass && !editorClass.__tapcocktailPressurePlanPatched) {
  editorClass.__tapcocktailPressurePlanPatched = true;

  const editorPrototype = editorClass.prototype;
  const originalSetConfig = editorPrototype.setConfig;
  const originalRender = editorPrototype._render;
  const originalEmitConfig = editorPrototype._emitConfig;

  editorPrototype.setConfig = function setEditorConfigWithPressurePlan(config) {
    return originalSetConfig.call(this, {
      show_pressure_plan: true,
      ...config,
    });
  };

  editorPrototype._emitConfig = function emitConfigWithPressurePreset(changes) {
    const pressureByPreset = {
      full: true,
      serving: true,
      carbonation: true,
      compact: false,
      minimal: false,
    };
    const preset = changes?.layout_preset;
    const pressureChange =
      preset && preset !== "custom" && preset in pressureByPreset
        ? { show_pressure_plan: pressureByPreset[preset] }
        : {};

    return originalEmitConfig.call(this, {
      ...changes,
      ...pressureChange,
    });
  };

  editorPrototype._render = function renderEditorWithPressurePlan(-���jם