# RouteStep

The black sheet that slides over the map while the shopper walks: floor segments on top, the big unit stat with the shop name and a landmark hint, time to the next stop, and two stat cards (price, verification).

Rules: the sheet is `panel` with `radius-sheet` top corners and `shadow-sheet`; a drag handle at the top; draggable with a tap alternative (the handle toggles half/full). Segments are one per floor in the plan, `panel-2` inactive, `orange` active, ≥ 44px tall. The unit is always the first stat in `stat` style. Stat cards are `panel-brown` then `panel-plum`, never elsewhere in the app. Stops advance with two actions in the full sheet: «رسیدم» and «رد کن».

Consumer provides: `floors` (list with the active one), `stop` (`unit`, `shopName`, `hint`, `priceThousands`, `verifiedAt`), `etaToNext`, `onFloor`, `onVisited`, `onSkip`.
