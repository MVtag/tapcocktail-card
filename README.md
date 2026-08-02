# TapCocktail Card

[![HACS Default](https://img.shields.io/badge/HACS-Default-41BDF5?style=flat-square&logo=home-assistant-community-store)](https://github.com/hacs/default)
[![Latest release](https://img.shields.io/github/v/release/MVtag/tapcocktail-card?style=flat-square)](https://github.com/MVtag/tapcocktail-card/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/MVtag/tapcocktail-card/total?style=flat-square)](https://github.com/MVtag/tapcocktail-card/releases)
[![GitHub stars](https://img.shields.io/github/stars/MVtag/tapcocktail-card?style=flat-square)](https://github.com/MVtag/tapcocktail-card/stargazers)
[![Open issues](https://img.shields.io/github/issues/MVtag/tapcocktail-card?style=flat-square)](https://github.com/MVtag/tapcocktail-card/issues)
[![License](https://img.shields.io/github/license/MVtag/tapcocktail-card?style=flat-square)](https://github.com/MVtag/tapcocktail-card/blob/main/LICENSE)

A custom Lovelace dashboard card for the [TapCocktail](https://github.com/MVtag/TapCocktail) Home Assistant integration.

TapCocktail Card provides a visual dashboard for every tap with drink selection, carbonation controls, recipe scaling, serving information, animated CO₂ bubbles, time on tap and keg shelf life. The same installation also includes TapCocktail Library Card for managing cocktail and ingredient libraries.

![TapCocktail Card showing Spezi on tap 2](images/tapcocktail-card.png)

## Features

- Visual Home Assistant card editor with live preview
- Supports taps 1–8 and any positive tap number
- Drink selector grouped by category
- Colour, icon, ABV, CO₂, temperature and glass information
- Carbonation status, progress, time selection and controls
- Recipe display for one glass, 2 litres or 9 litres
- Serving tips and time on tap
- Keg shelf-life display with remaining or overdue days
- Green, orange and red shelf-life states
- Full, serving, carbonation, compact and minimal layouts
- Animated CO₂ bubbles
- Danish duration formatting
- Cocktail and ingredient library tabs
- Search and category filtering
- Create, edit and delete cocktails and ingredients
- Mobile-friendly editor dialogs with deletion confirmation

## Requirements

Install and configure the [TapCocktail integration](https://github.com/MVtag/TapCocktail) first. Shelf-life display requires TapCocktail **v1.8.0 or newer**. TapCocktail Library Card requires TapCocktail **v2.1.0 or newer** and a Home Assistant administrator account.

## Installation with HACS

1. Open HACS.
2. Search for **TapCocktail Card** under dashboards.
3. Download the card.
4. Refresh the browser when Home Assistant asks you to.

If it is not listed in your HACS catalogue yet, add this custom **Dashboard** repository:

```text
https://github.com/MVtag/tapcocktail-card
```

## Manual installation

1. Download `tapcocktail-card.js`.
2. Copy it to `/config/www/tapcocktail-card.js`.
3. Open **Settings → Dashboards → Resources**.
4. Add `/local/tapcocktail-card.js` as a **JavaScript Module**.
5. Refresh the browser.

## Basic configuration

Add the card through the visual dashboard editor, or use YAML:

```yaml
type: custom:tapcocktail-card
tap: 1
name: Hane 1
```

For another tap, change `tap` and the name. The editor controls layouts, visible information, recipe size, carbonation controls, time on tap and shelf-life display.

## Library Card

The Library Card is installed together with the regular card. Add it through the dashboard editor, or use YAML:

```yaml
type: custom:tapcocktail-library-card
title: TapCocktail Bibliotek
```

It provides separate Cocktail and Ingredient tabs with search, filtering and safe create, edit and delete actions. Deletion always requires confirmation.

If Home Assistant has more than one TapCocktail integration entry, add its entry ID:

```yaml
type: custom:tapcocktail-library-card
title: TapCocktail Bibliotek
entry_id: your_config_entry_id
```

## Shelf-life display

TapCocktail Card uses the recipe's shelf life together with `sensor.hane_<number>_tid_pa_fad`. It shows days remaining, the last recommended day or how many days the recommendation has been exceeded.

Cocktails configured with **No expiration date**, and older recipes without shelf-life data, continue to work without a shelf-life badge.

## ESPHome tap display

The TapCocktail project also supports a round **LILYGO T-RGB 2.1-inch ESPHome display**. It shows the selected drink, carbonation progress and the ready-to-serve screen directly at the tap. Current shelf-life status can also be shown on the ready screen.

See the [TapCocktail ESPHome setup](https://github.com/MVtag/TapCocktail#-lilygo-t-rgb-esphome-display).

## Updating

HACS shows new releases automatically. After updating the card, use `Ctrl + F5` if the browser still displays an older JavaScript version. Restart Home Assistant after updating the TapCocktail integration itself.

## License

MIT License
