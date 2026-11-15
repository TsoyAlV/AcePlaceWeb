# Размещение сайта Ace Place на сервере бота

Инструкция подготовлена для существующего сервера Telegram-бота: Ubuntu 22.04, Docker Compose, VPS `151.243.177.216`, SSH-пользователь `root`. Это данные из документации проекта, а не результат проверки действующего сервера. Если IP или логин изменились, замените их в командах. Если SSH использует другой порт, для `ssh` добавьте `-p ПОРТ`, для `scp` — `-P ПОРТ`.

Сайт статический: для него не нужны Node.js, Python, база данных или сборка на сервере. Его отдаёт отдельный контейнер Caddy. Бот продолжает работать в своём Compose-проекте, сайт — в `/opt/ace-place-web` с именем проекта `ace-place-web`.

Дополнительная плата за сервер обычно не требуется, если хватает ресурсов и трафика текущего тарифа VPS. Собственный домен приобретается отдельно. Для начальной проверки домен не нужен.

## 1. Проверить сервер

**Windows / PowerShell:**

```powershell
ssh root@151.243.177.216
```

**Сервер / Bash:**

```bash
docker compose version
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ss -ltnp '( sport = :80 or sport = :443 )'
df -h /
free -h
```

Порты TCP 80 и 443 должны быть свободны. Если они заняты Nginx, Apache, Caddy или другим контейнером, не останавливайте его вслепую: сайт нужно подключить к существующему веб-серверу. Дальнейшая инструкция рассчитана на свободные порты.

Создайте отдельную папку:

```bash
mkdir -p /opt/ace-place-web/public /opt/ace-place-web/caddy
```

## 2. Подготовить контакты и данные сайта

На Windows откройте `dist/config.js` в проекте. Заполните только нужные значения. Например, в `telegram` и `bookingUrl` укажите полную ссылку на вашего действующего бота в формате `https://t.me/ИМЯ_БОТА` — без символа `@` и без токена.

В `price`, `capacity` и `rentalDuration` есть отдельные значения `ru` и `ko`. Пустые значения оставляют нейтральные подписи. Адрес меняется в `address` для обоих языков и в `mapQuery` для карты.

Этот файл публичный. Токен бота и другие секреты остаются в конфигурации бота. Файл `config.yaml` сайта не настраивает и переносить его в веб-каталог не нужно.

## 3. Загрузить сайт с Windows

Откройте **второе окно PowerShell на Windows**, а не вводите эти команды внутри SSH:

```powershell
$aceWebsite = 'C:\Users\User\Documents\ChatGPT\Проект для Брата Ace Place\website'
$aceWebArchive = Join-Path $env:TEMP 'ace-place-web-files.tar.gz'

tar -czf $aceWebArchive -C "$aceWebsite\dist" .
scp $aceWebArchive root@151.243.177.216:/opt/ace-place-web/site-files.tar.gz
scp "$aceWebsite\deploy\compose.yaml" root@151.243.177.216:/opt/ace-place-web/compose.yaml
scp "$aceWebsite\deploy\Caddyfile" root@151.243.177.216:/opt/ace-place-web/caddy/Caddyfile
```

Дождитесь успешного завершения каждой команды. При отсутствии `scp` файлы можно загрузить через SFTP-панель MobaXterm в те же пути.

Архив содержит только публичный каталог `dist`: HTML, CSS, JavaScript и фотографии. `.env`, база данных, Git и секреты бота в него не входят.

## 4. Запустить сайт

Вернитесь в **SSH / Bash на сервере**:

```bash
cd /opt/ace-place-web
tar -xzf site-files.tar.gz -C public
test -f public/index.html
docker compose config --quiet
docker compose pull web
docker compose run --rm --no-deps web caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose up -d web
docker compose ps
docker compose logs --tail 50 web
curl -I http://127.0.0.1/
```

Ожидается работающий контейнер `web` и ответ `HTTP/1.1 200 OK`. Если проверка конфигурации завершилась ошибкой, исправьте её до запуска.

В панели провайдера VPS разрешите входящие **TCP 80 и TCP 443** для сайта. SSH-порт сохраните открытым. Если на сервере уже включён UFW, добавьте правила:

```bash
ufw status
```

Только если статус `active`:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

Для этого запуска включать UFW с нуля не требуется. Публикация портов Docker может обходить правила UFW; внешний доступ также контролируйте в сетевом экране провайдера.

Откройте в браузере Windows или телефона:

```text
http://151.243.177.216
```

Это начальная проверка по HTTP. Проверьте оба языка, изображения, меню, карту и кнопку бронирования. Если `bookingUrl` пока пустой, кнопка прокручивает к контактам; она не создаёт бронирование в базе бота.

## 5. Подключить домен и HTTPS

У регистратора домена создайте DNS-запись:

| Тип | Имя | Значение |
| --- | --- | --- |
| A | @ | 151.243.177.216 |

В интерфейсе некоторых регистраторов вместо `@` оставляют пустое поле. Домен выберите и приобретите самостоятельно; далее `YOUR-DOMAIN` обозначает именно его. Не вводите этот текст буквально. Уберите конфликтующие A-записи для того же имени. AAAA добавляйте только при наличии настроенного IPv6 сервера. Для первого запуска с Cloudflare DNS используйте режим DNS only.

На сервере проверьте, что домен указывает на IP VPS:

```bash
getent ahostsv4 YOUR-DOMAIN
```

Откройте конфигурацию:

```bash
nano /opt/ace-place-web/caddy/Caddyfile
```

Замените только `:80` в первой строке на свой домен, без `https://`. Например, для домена `aceplace.example` конфигурация выглядит так; это иллюстративное имя, замените его своим:

```caddyfile
aceplace.example {
    root * /srv
    encode zstd gzip
    header /config.js Cache-Control "no-cache"
    file_server
}
```

В nano: `Ctrl+O`, Enter — сохранить; `Ctrl+X` — выйти.

Примените изменения:

```bash
cd /opt/ace-place-web
docker compose exec -T web caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose exec -T web caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
docker compose logs --tail 100 web
```

После успешной проверки и перезагрузки Caddy автоматически получает и продлевает TLS-сертификат, а HTTP перенаправляет на HTTPS. Для этого DNS должен указывать на VPS, а TCP 80 и 443 — быть доступны извне. Сертификаты сохраняются в отдельном Docker volume.

Откройте `https://ВАШ-ДОМЕН` и проверьте:

```bash
curl -I https://YOUR-DOMAIN
curl -I http://YOUR-DOMAIN
```

HTTPS должен отвечать успешно, HTTP — перенаправлять на HTTPS. Если нужен также `www`, добавьте DNS-запись для `www` на этот сервер и второе имя в первой строке Caddyfile через запятую, затем повторите проверку и reload. Сам по себе `www` не включён.

## 6. Обновлять сайт

Редактируйте файлы в `dist` на Windows. Для изменения цены, контактов и ссылки на бота достаточно `config.js`.

**Windows / PowerShell:**

```powershell
$aceWebsite = 'C:\Users\User\Documents\ChatGPT\Проект для Брата Ace Place\website'
$aceWebArchive = Join-Path $env:TEMP 'ace-place-web-files.tar.gz'
tar -czf $aceWebArchive -C "$aceWebsite\dist" .
scp $aceWebArchive root@151.243.177.216:/opt/ace-place-web/site-files.tar.gz
```

**Сервер / Bash:**

```bash
cd /opt/ace-place-web
tar -czf "site-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C public .
tar -xzf site-files.tar.gz -C public
```

Перезапуск контейнера не нужен: Caddy читает файлы из `public`. Обновите страницу через `Ctrl+F5`. Распаковка заменяет существующие файлы, но не удаляет файлы, которых больше нет в новом архиве. Если убираете фотографию из публикации, удалите соответствующий старый файл из `public/assets` отдельно.

При обычном обновлении загружайте только архив сайта. Не загружайте заново начальный Caddyfile с `:80`, иначе потеряете настройку домена при следующей перезагрузке Caddy.

Если требуется вернуть предыдущую версию, распакуйте выбранный `site-backup-…tar.gz` в `public`; файлы, добавленные после резервной копии, при необходимости удалите отдельно.

## 7. Обслуживание и диагностика

Команды сайта выполняйте из `/opt/ace-place-web`:

```bash
cd /opt/ace-place-web
docker compose ps
docker compose logs --tail 100 web
```

Остановить только сайт:

```bash
docker compose stop web
```

Запустить снова:

```bash
docker compose up -d web
```

Для проверки бота используйте его существующую папку:

```bash
cd /opt/ace-place
docker compose ps
```

Проекты разделены: изменение сайта не требует перезапуска бота. Не запускайте команды удаления volumes для обслуживания сайта; `caddy_data` хранит сертификаты, а volumes бота — его базу.

| Симптом | Что проверить |
| --- | --- |
| `address already in use` | Другой процесс занял 80 или 443; проверьте `ss` и `docker ps`. |
| По IP не открывается, но локальный `curl` возвращает 200 | IP сервера и входящие правила панели провайдера. |
| 404 на главной | Наличие `/opt/ace-place-web/public/index.html`; он должен лежать прямо в `public`, а не в `public/dist`. |
| Не выпускается сертификат | A/AAAA, доступность 80/443 извне и логи `web`. |
| Старые контакты | Содержимое серверного `public/config.js` и принудительное обновление страницы. |
| Бронирование не открывает бота | Полный HTTPS-адрес в `bookingUrl`, правильное имя действующего Telegram-бота. |

## Официальные материалы

- [Caddy в Docker Compose](https://caddyserver.com/docs/running#docker-compose)
- [Автоматический HTTPS и его требования](https://caddyserver.com/docs/automatic-https)
- [Раздача статических файлов](https://caddyserver.com/docs/caddyfile/directives/file_server)

Эта инструкция и конфигурации подготовлены локально. На VPS команды не выполнялись; фактическое состояние портов, DNS и ресурсов нужно проверить по шагу 1.
