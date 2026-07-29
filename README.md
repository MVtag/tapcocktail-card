# TapCocktail Card

A custom Lovelace dashboard card for the [TapCocktail](https://github.com/MVtag/TapCocktail) Home Assistant integration.

TapCocktail Card gives each cocktail tap a visual dashboard with cocktail selection, carbonation controls, recipe scaling, serving information, animated CO₂ bubbles and time-on-tap tracking.

![TapCocktail Card showing Spezi on tap 2](images/tapcocktail-card.png)

## Features

- Visual editor in the Home Assistant dashboard
- Supports any positive tap number
- Cocktail selector grouped by category
- Cocktail color, icon, ABV, CO₂, temperature and glass information
- Carbonation status, progress and controls
- Recipe display for one glass, 2 liters or 9 liters
- Serving tips and time on tap
- Danish duration formatting, including `1 dag og 11 timer`
- Full, serving, carbonation, compact and minimal layout presets
- Animated CO₂ bubbles

## Requirements

Install and configure the [TapCocktail integration](https://github.com/MVtag/TapCocktail) before using this card.

## Installation with HACS

1. Open HACS in Home Assistant.
2. Open the menu and choose **Custom repositories**.
3. Add `https://github.com/MVtag/tapcocktail-card`.
4. Select **Dashboard** as the category.
5. Install **TapCocktail Card**.
6. Refresh the browser if Home Assistant asks you to.

## Manual installation

1. Download `tapcocktail-card.js`.
2. Copy it to `/config/www/tapcocktail-card.js`.
3. In Home Assistant, open **Settings → Dashboards → Resources**.
4. Add `/local/tapcocktail-card.js` as a **JavaScript Module**.
5. Refresh the browser.

## Basic configuration

Add the card through the dashboard editor, or use YAML:

```yaml
type: custom:tapcocktail-card
tap: 1
name: Hane 1
```

For a second or third tap, change `tap`:

```yaml
type: custom:tapcocktail-card
tap: 2
name: Hane 2
```

The visual editor can configure layout presets, displayed information, recipe size and card controls.

## Updating

When installed through HACS, updates are shown and installed from HACS. After updating the JavaScript file, refresh the browser cache if the old card is still displayed.

## License

MIT License
