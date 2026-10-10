# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript + Vite (user chose "plain React web app"). Tailwind CSS v4, React Router, TanStack Query/Table, Motion for springs. Charting delegated: Plotly.js for model charts (forecast, time machine, SHAP) for parity with the backend's Python plotly; hand-built SVG for the contagion network and spillover heatmap.

## Users

Primary: AICON'26 judges watching a live demo by team Null Pointerz. They need to grasp in seconds what the system predicts and be convinced the model is accurate without data leakage. The product is framed as a tool for wholesale procurement/ops buyers in Punjab markets, but the demo audience is the judges.

## Product Purpose

YIELD is an early-warning system for vegetable price spikes in Pakistani wholesale markets. It forecasts 7 days of modal prices (SARIMAX), flags imminent spikes (XGBoost), and explains why (SHAP). Success: within 5 seconds a viewer knows **whether a spike is coming** for the selected crop and market.

## Positioning

Not just a price chart: it answers "is a spike coming, how sure are we, and why", and proves it with a Time Machine that replays what the model predicted on a past date against what actually happened.

## Operating Context

Live demo on a laptop/projector, presenter switching market, crop and date. Global filters: date, market (Lahore, Multan, Gujranwala, Rawalpindi), crop (Onion, Tomato, Potato Fresh, Green Chilli). Six views: Live Snapshot, 7-Day Forecast, Time Machine, Alert History, Analytics, Performance.

## Capabilities and Constraints

- Backend (Python) is still in development; the frontend runs on a typed mock service layer until the API contract exists. Mock values are synthetic and labelled as such.
- Inference (SARIMAX/XGBoost/SHAP) can take seconds; loading states must be clear, especially Time Machine travels.
- Historical points carry `is_imputed_date`; imputed points must be visually distinct.
- Color semantics are fixed by spec: red = spike alert / high panic, yellow/amber = elevated volatility, green/blue = stable. Crop series must be color-blind safe.
- Prices are in PKR.

## Brand Commitments

Name: YIELD. Team: Null Pointerz. User has brand assets (logo/colors/font) to share later; until then, a neutral placeholder wordmark is used and tokens are centralised for an easy swap. User pinned: **light theme**, and **not info-dumped** (one primary answer per view, details disclosed progressively).

## Evidence on Hand

- `../yield_features_final.csv`: real engineered features (price, volatility_7d/30d, panic_index_7d, roc_7d/30d, lags, is_imputed_date) per market/crop/date from 2020.
- `../scraper.py`: AMIS.pk scraper source of raw prices.
- No real model metrics, alerts, savings figures or analogues exist yet; all such numbers in the UI are mock and must not be presented as real results.

## Product Principles

1. Answer first: every view leads with its one conclusion in plain language.
2. Show your work on demand: metrics and jargon (MAPE, SHAP, panic index) one level deeper, with plain explanations.
3. Prove, don't claim: the Time Machine and Alert History are the evidence; keep them honest.
4. Color means risk: never spend red/amber/green on decoration.

## Accessibility & Inclusion

WCAG AA contrast on a light surface, keyboard-navigable filters and tabs, color never the only carrier of risk (always paired with a label/icon), reduced-motion respected.
