# Fitnes

Личный дневник веса, роста, мышечной массы и обхватов. В обзоре есть динамика за выбранный период, в истории можно редактировать замеры, а в целях — настроить направление и свои целевые значения.

## Локальный запуск

Нужен Node.js 24 LTS и npm.

```sh
npm ci
npm run dev
```

Откройте адрес из вывода Vite. Замеры, профиль и цели хранятся в IndexedDB текущего браузера. Раздел «Мои данные» выгружает и восстанавливает весь дневник из JSON. При смене браузера, устройства или адреса приложения перенесите данные через этот файл.

## Импорт Apple Health

На iPhone откройте приложение «Здоровье», нажмите на значок профиля и выберите экспорт всех данных. В Fitnes откройте «Мои данные» → «Импорт из Apple Health», выберите архив ZIP или файл `export.xml` и подтвердите предпросмотр. Fitnes извлекает вес и рост в браузере. При нескольких замерах за день берётся последний по времени, а уже заполненные значения дневника сохраняются. [Инструкция Apple](https://support.apple.com/en-me/guide/iphone/iph5ede58c3d/ios)

В экспорт попадают замеры, которые уже есть в Apple Health. Например, весы Xiaomi S400 могут передавать туда вес и рост через Xiaomi Home. Для автоматического чтения из HealthKit требуется iOS-приложение с разрешением на доступ к нужным показателям. [Xiaomi S400](https://www.mi.com/uk/support/faq/details/KA-107891/), [Apple HealthKit](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)

Zepp Life позволяет выгрузить персональные данные и передать вес в Mi Fitness. Браслеты Xiaomi передают показатели активности в поддерживаемые приложения в зависимости от модели. Импорт Fitnes подхватит записи веса и роста, если они уже попали в Apple Health. [Выгрузка Zepp Life](https://www.huami.com/privacy-support), [перенос в Mi Fitness](https://www.mi.com/ph/support/article/KA-42608/), [Xiaomi Smart Band 10](https://www.mi.com/global/support/faq/details/KA-579104/)

## GitHub Pages

1. Добавьте файлы проекта в GitHub-репозиторий с основной веткой `main`.
2. В репозитории выберите **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Запустите **Actions → GitHub Pages → Run workflow** или отправьте следующий коммит в `main`. Адрес появится в окружении `github-pages` после деплоя.

Workflow берёт путь публикации из `configure-pages` и передаёт его Vite. Для обычной сборки в корне используется `/`. Чтобы проверить сборку под путём репозитория, запустите сквозной тест.

## Проверки

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Автоматизация покрывает расчёты и сохранность дневника. Сквозной тест поднимает сборку на `/fitnes-test/`. С установленным Chrome можно задать `PLAYWRIGHT_CHANNEL=chrome` и использовать его. Сценарии ручной приёмки — в [CHECKLIST.md](CHECKLIST.md).

## Данные и интерфейс

- Компоненты разделов и форм находятся в `src/components`. Формат дневника, каталог показателей и расчёты находятся в `src/domain`. Транзакции IndexedDB и резервные копии обслуживает `src/storage`.
- Запись может содержать один или несколько замеров. ИМТ использует рост, известный на дату взвешивания. В протоколах NICE и NHANES разные точки измерения талии. Для каждого замера есть своё поле.
- Справочные категории и данные выборки сопровождаются источниками. NHANES для США за август 2021 — август 2023 используется по таблицам 3, 7, 10, 12, 14 и 16. [CDC BMI](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html), [NICE NG246](https://www.nice.org.uk/guidance/ng246/chapter/Identifying-and-assessing-overweight-obesity-and-central-adiposity), [NHANES](https://stacks.cdc.gov/view/cdc/174595), [протокол NHANES](https://stacks.cdc.gov/view/cdc/127207).
- В формах использованы нативные поля, отложенная индикация ошибок и связь ошибок с полями. Подтверждения открываются в нативном `dialog`. Компоненты меняют раскладку через контейнерные запросы. [Google Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance).
