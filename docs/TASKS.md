# Очередь задач Fitnes

Порядок строк в очереди задаёт приоритет сверху вниз. Статус показывает, можно ли взять задачу. Сначала продолжай текущую работу или проверку, затем бери верхнюю задачу со статусом **К работе**, у которой выполнены зависимости. Заблокированная задача сохраняет место в очереди и становится доступной после снятия блокировки.

| Статус | Когда ставить |
| --- | --- |
| Черновик | Идея записана, результат или критерии ещё формулируются |
| К работе | Результат и критерии понятны, зависимости закрыты |
| В работе | Есть исполнитель и работа началась |
| На проверке | Результат передан на приёмку |
| Заблокировано | Продолжению мешает зависимость или техническое препятствие, причина записана в задаче |
| Готово | Критерии проверены, итог зафиксирован |

## Очередь

| ID | Задача | Статус | Исполнитель |
| --- | --- | --- | --- |
| FIT-005 | Перепроектировать сценарии ввода замеров и целей | В работе | Дизайнер UI/UX |
| FIT-006 | Совместить интерактивные зоны с анатомическим атласом | В работе | Веб-разработчик |

### FIT-005 · Ввод замеров и цели

- Ожидаемый результат — дизайн ежедневного сценария Fitnes на телефоне и компьютере. Предложить, какие поля убрать из повседневного сценария, какие раскрывать по запросу и какие действия выполнять прямо из показателя.
- Критерии приёмки — из карты и обзора можно открыть один нужный показатель, ввести число и сохранить. Пакетный ввод, исправление записи и выбор даты доступны по контексту. Решения по целям, профилю и импорту выводятся из аудита существующих экранов. Для обычного сценария предусмотрены пустое состояние, ошибка, сохранение и восстановление после неудачного действия.
- Границы этапа — дизайн и прототип. Будущие фото и оценка ИИ учитываются как источник черновика замеров с проверкой и коррекцией перед сохранением.
- Материалы — [вводная дизайнера](DESIGN.md), формы в `src/components`, макеты для 320, 390 и настольной ширины.

### FIT-006 · Контуры интерактивных мышц

- Ожидаемый результат — интерактивные области и контур выбора совпадают с изображением человека спереди и сзади, включая асимметрию изображения.
- Критерии приёмки — зоны следуют границам соответствующих областей атласа, выбор и статус читаются на 320, 390 и настольной ширине. Нажатия по обеим сторонам фигуры открывают правильный показатель. Выбор зоны из списка, клавиатура и сохранение замера работают.
- Материалы — [вводная разработчика](DEVELOPMENT.md), [утверждённый атлас](../src/assets/anatomy-atlas.webp), `MuscleFigure.tsx`, `MuscleMap.module.scss`, сквозные тесты карты. Визуальную приёмку проводит дизайнер.

К каждой новой строке добавляй подробности по шаблону ниже. Используй следующий свободный ID `FIT-XXX`. После приёмки перенеси запись в «Готово» с коротким итогом.

### Шаблон подробностей

```md
### FIT-XXX · Короткое название

- Ожидаемый результат — …
- Критерии приёмки — …
- Связанные задачи или причина блокировки — …
- Макет, файлы или другие материалы — …
```

## Готово

| ID | Задача | Статус | Итог |
| --- | --- | --- | --- |
| FIT-001 | Карта мышц | Готово | Два ракурса, выбор зоны, замеры и цвет по личной цели. Проверено на 320 и 390 px. [Экран](../src/components/MuscleMap.tsx) · [тесты](../tests/muscles.spec.ts) |
| FIT-002 | Объёмная карта мышц и сводка | Готово | Дизайнер принял оба ракурса. На 1440, 390 и 320 px проверены сводка и интерактивные зоны. [Атлас](../src/assets/anatomy-atlas.webp) · [тесты](../tests/muscles.spec.ts) |
| FIT-003 | Локальный импорт Apple Health | Готово | Вес и рост из ZIP/XML, предпросмотр и атомарное слияние. Проверено на синтетическом экспорте в Chrome и WebKit. [Сценарий](../tests/appleHealth.spec.ts) · [инструкция](../README.md#импорт-apple-health) |
| FIT-004 | БЭМ и SCSS Modules | Готово | Стили компонентов изолированы, базовые правила и палитра в global.scss. Сборка и сквозные тесты прошли. [Правила](DEVELOPMENT.md) |

### Материалы FIT-002

[Анатомический атлас](../src/assets/anatomy-atlas.webp) создан встроенным ImageGen и перекодирован в WebP с прозрачностью.

<details>
<summary>Финальный промпт ImageGen</summary>

Use the existing two-view artwork as a pose and camera template. Keep its two matching fully clothed mannequin figures, front to the left and back to the right, straight orthographic camera, adult proportions, full heads, hands and shoes, same baseline, same transparent background and no cast shadow. Change ONLY the sports apparel design so it functions as an accessible professional training atlas: replace the loose outdoor jacket and pants with an opaque, slim long-sleeve graphite technical athletic shirt and opaque high-waisted full-length training tights, with an obvious distinct waistband and textile seams, no folds hiding landmarks. Keep the graphite apparel covering everything from collar to cuffs and shoes. Use silver, graphite and desaturated steel printed textile panels or thin sewn outline graphics that deliberately follow the deltoid caps, chest major muscles, biceps and triceps, forearms, abdominal and lower-back areas, gluteal region, front/back thighs and lower legs. Show soft, physically realistic surface depth and believable clothed human proportion. Clearly visible atlas-like garment panel edges and slight shaped relief, restrained tonal separation between neighboring muscle groups, subdued cool grayscale. No text, no labels, no colors beyond graphite and steel. True transparent alpha. Preserve the controlled pose, image framing and equal sizes, ensure generous margin above each head and under both shoes.

</details>
