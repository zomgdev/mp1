# Изменения

Дата: 2026-02-12

1. Реорганизованы модели:
   - Добавлен файл `internal/model/scheme.go`.
   - Структуры дерева и схемы вынесены в отдельный пакет.
   - Добавлены `NewDefaultScheme` и `NormalizeScheme` для стабильной нормализации схемы.

2. Выделен слой файлового хранилища:
   - Добавлен `internal/storage/filejson/json.go` с общими функциями чтения/записи JSON.
   - Добавлен `internal/storage/filejson/tree_repo.go` для загрузки данных дерева.
   - Добавлен `internal/storage/filejson/scheme_repo.go` для загрузки/сохранения текущей схемы.

3. HTTP-обработчики разделены по ответственности:
   - Добавлен `internal/httpapi/handlers/tree.go` для `GET /api/tree`.
   - Добавлен `internal/httpapi/handlers/scheme.go` для `GET/POST /api/scheme/current`.
   - Добавлен `internal/httpapi/handlers/helpers.go` для JSON-ответов.
   - Добавлена проверка методов и ограничение размера тела запроса для обновления схемы.

4. Добавлен пакет роутера:
   - Добавлен `internal/httpapi/router.go`.
   - Централизована регистрация API-эндпоинтов и статических файлов.

5. Упрощен вход в приложение:
   - Обновлен `main.go`: оставлены только сборка зависимостей и запуск сервера.
   - Добавлена явная конфигурация `http.Server` и обработка ошибки запуска.

6. Проверка:
   - Выполнен `gofmt` для обновленных Go-файлов.
   - Выполнен `go test ./...` (все пакеты проходят, тестовых файлов пока нет).

7. Заполнен файл `features.md`:
   - добавлено описание реализованного функционала проекта на русском языке;
   - отражены возможности backend API, навигационного фронтенда и редактора схем.

8. Добавлена страница Discovery:
   - создан файл `front/tools/discovery/index.html`;
   - добавлен заголовок `Discovery`;
   - добавлена таблица со столбцами `id`, `fqdn`, `ip`, `status`;
   - добавлено 10 тестовых записей.

9. Стили страницы Discovery вынесены в отдельный файл:
   - создан `front/tools/discovery/discovery.css`;
   - из `front/tools/discovery/index.html` удален встроенный блок `<style>`;
   - подключение выполнено через `<link rel="stylesheet" href="discovery.css" />`.

10. Подключена страница Discovery в правой панели главного интерфейса:
   - в `front/app/contentRouter.js` добавлен роут для пункта `Discovery` с встраиванием `tools/discovery/index.html` через `iframe`;
   - в `front/app/treeData.js` добавлен пункт `Discovery` в fallback-структуру меню;
   - в `front/inc/fallback.js` добавлена поддержка открытия `Discovery` аналогично `Infra layer`.

11. Обновлена таблица Discovery:
   - таблица выровнена по левой стороне страницы;
   - добавлена подсветка строки таблицы при наведении курсора;
   - в правой части строки при hover добавлена кнопка `Факты`.

12. Реализован сбор фактов Discovery по кнопке `Факты`:
   - добавлен API `POST /api/discovery/facts` (`internal/httpapi/handlers/discovery.go`);
   - из таблицы Discovery на фронте отправляется `ip` хоста в `/api/discovery/facts` (`front/tools/discovery/discovery.js`);
   - бэкенд по SSH выполняет `cat /etc/os-release` на указанном хосте (`internal/discovery/facts_collector.go`);
   - лог подключения и выполнения команды пишется в `data/log/discovery/` с именем `discover_YYYYMMDDHHMMSS.log`.

13. Таблица Discovery переведена на данные из backend:
   - тестовые хосты вынесены в `data/discovery/hosts.json`;
   - добавлен endpoint `GET /api/discovery/hosts`, который читает `hosts.json`;
   - страница `front/tools/discovery/index.html` больше не содержит хардкод строк таблицы;
   - `front/tools/discovery/discovery.js` загружает список хостов через API и динамически рендерит таблицу.

14. Обновлена авторизация Discovery по SSH через hosts.json:
   - в `data/discovery/hosts.json` добавлены поля `login`, `password`, `key` для каждого хоста;
   - `POST /api/discovery/facts` теперь ищет хост по `ip` в `hosts.json` и использует `login/password` из этого файла для SSH-подключения;
   - `GET /api/discovery/hosts` оставлен безопасным: возвращает только `id`, `fqdn`, `ip`, `status` без секретных полей.

15. Исправлена загрузка списка Discovery hosts:
   - причина: `data/discovery/hosts.json` был сохранен с UTF-8 BOM, из-за чего `encoding/json` в Go возвращал ошибку;
   - `hosts.json` пересохранен без BOM;
   - в `internal/storage/filejson/json.go` добавлена защита: перед `json.Unmarshal` удаляется BOM (`EF BB BF`), чтобы такие файлы не ломали API в будущем.

16. Обновлен `.gitignore`:
   - добавлено правило `data/log/` для исключения логов Discovery из git.

Дата: 2026-02-13

17. Реализован модуль Discovery в UI:
   - добавлена страница `front/tools/discovery/index.html`;
   - вынесены стили в `front/tools/discovery/discovery.css`;
   - добавлено открытие Discovery в правой панели через `contentRouter`.

18. Реализован backend для Discovery:
   - добавлен `POST /api/discovery/facts` с SSH-выполнением `cat /etc/os-release`;
   - добавлен `GET /api/discovery/hosts` для выдачи списка хостов;
   - лог SSH-запросов пишется в `data/log/discovery/discover_YYYYMMDDHHMMSS.log`.

19. Источник данных таблицы вынесен в файл:
   - добавлен `data/discovery/hosts.json`;
   - фронтенд Discovery загружает хосты через backend API и рендерит таблицу динамически.

20. Обновлена модель авторизации хостов:
   - в `hosts.json` добавлены поля `login`, `password`, `key`;
   - SSH-подключение использует `login/password` хоста из `hosts.json`.

21. Исправлена проблема загрузки hosts:
   - устранен BOM в `hosts.json`;
   - в JSON-чтение добавлена защита от BOM в `internal/storage/filejson/json.go`.

22. Обновлен `.gitignore`:
   - добавлено правило `data/log/`.
