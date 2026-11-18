---
name: telegram-mini-app-webview
description: Изменяй и проверяй запуск Telegram Mini App, тему, viewport, безопасные отступы, нативную навигацию и кнопки на React.
---

## Порядок работы

1. Начни с `web/src/telegram.ts` и `web/src/styles.css`. Расширяй текущий адаптер на `@tma.js/sdk-react` v3. Проверяй доступность нативного API и сохраняй работу приложения в браузере и при неполных параметрах запуска.
2. Для темы и размеров используй переменные, которые публикует SDK. Проверь светлую и тёмную темы, системные и контентные safe areas, изменение высоты при открытии клавиатуры и отсутствие обрезанного контента. Используй существующие CSS-значения по умолчанию.
3. Связывай нативные элементы с жизненным циклом маршрута. Удаляй обработчики и скрывай кнопку при уходе со страницы. Для MainButton, HapticFeedback и полноэкранного режима сверяй поддержку и продумывай действие, доступное в обычном браузере.
4. Для изменений запуска, темы или навигации расширяй сценарий `web/e2e/telegram.spec.ts`. Для регрессий обычного браузера используй `web/e2e/smoke.spec.ts`. Для проверки особенностей WebView используй реальное устройство, если доступно. Для проверки подписи, токенов или прав подключай `telegram-auth-change`.

## Результат

Укажи проверенные сценарии и платформы. Различай браузер, имитацию моста в Playwright и реальный Telegram WebView.

Справочники для конкретных задач. [Telegram Mini Apps](https://core.telegram.org/bots/webapps) · [Telegram SDK для React v3](https://docs.telegram-mini-apps.com/packages/legacy/tma-js-sdk-react) · [Исходный Telegram Mini App Development Guide](https://github.com/Rithprohos/telegram-mini-app-skills/blob/main/SKILL.md)
