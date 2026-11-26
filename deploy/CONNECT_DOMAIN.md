# Подключение aceplace.kr к действующему сайту

DNS уже настроен в Hosting.kr: A-записи `@` и `www` указывают на `151.243.177.216`, TTL — 180 секунд. Конфигурация ниже рассчитана на существующий проект `/opt/ace-place-web` из этой папки: сервис `web`, каталог сайта `/srv` внутри контейнера, каталог конфигурации `/etc/caddy`. До применения сверьте действующие `compose.yaml` и `caddy/Caddyfile` на VPS. Файл подготовлен локально; сам по себе он не меняет сервер.

## Загрузить конфигурацию

Через SFTP в MobaXterm загрузите локальный `deploy/aceplace-domain.caddy` в:

```text
/opt/ace-place-web/caddy/aceplace-domain.caddy
```

Этот файл добавляет два имени к существующему сайту. Главный `Caddyfile` не заменяется: так сохраняются текущие настройки и прежние адреса.

## Подключить на VPS

Команды выполняются в SSH-терминале MobaXterm. Перед этим посмотрите `cat /opt/ace-place-web/caddy/Caddyfile`: если `aceplace.kr` уже настроен непосредственно в нём, сначала согласуйте блоки, чтобы не добавить один адрес дважды.

```bash
cd /opt/ace-place-web
test -f caddy/aceplace-domain.caddy
docker compose ps web
getent ahostsv4 aceplace.kr
getent ahostsv4 www.aceplace.kr
```

Оба домена должны указывать на `151.243.177.216`, а сервис `web` должен работать. Затем подключите файл (повторный запуск не добавляет ту же строку импорта):

```bash
cd /opt/ace-place-web
ace_caddy_backup="caddy/Caddyfile.before-domain-$(date +%Y%m%d-%H%M%S)"
cp -- caddy/Caddyfile "$ace_caddy_backup"
if ! grep -Fqx 'import /etc/caddy/aceplace-domain.caddy' caddy/Caddyfile; then
    printf '\nimport /etc/caddy/aceplace-domain.caddy\n' >> caddy/Caddyfile
fi
if docker compose exec -T web caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
    if ! docker compose exec -T web caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
        cp -- "$ace_caddy_backup" caddy/Caddyfile
        echo 'Reload failed; the previous configuration file was restored. Inspect web logs.'
    fi
else
    cp -- "$ace_caddy_backup" caddy/Caddyfile
    echo 'Validation failed; the previous configuration file was restored. Nothing was reloaded.'
fi
docker compose logs --tail 80 web
```

У сервера должны оставаться доступны TCP 80 и 443. Caddy автоматически запросит публичные сертификаты для обоих имён и будет продлевать их в существующем `caddy_data`. Покупать сертификат отдельно, пересобирать образ и перезапускать бота не нужно.

## Проверить результат

После выпуска сертификата:

```bash
curl -I https://aceplace.kr/
curl -I https://www.aceplace.kr/
curl -I http://aceplace.kr/
```

HTTPS должен отвечать успешно, HTTP — перенаправлять на HTTPS. Проверку выполняйте без `-k`: она должна подтвердить доверие к сертификату. Если выпуск ещё не завершён, проверьте логи `web`; ошибки DNS и недоступность портов нужно устранить, после чего Caddy повторит попытку.

После успешной проверки замените `welcome.website_url` в серверном конфиге бота `/opt/ace-place/config.yaml` на `https://aceplace.kr/` и перезапустите только бот:

```bash
cd /opt/ace-place
docker compose --profile bot restart bot
```

Копировать локальный конфиг бота поверх серверного целиком не требуется. Страница политики конфиденциальности и подтверждение домена в Google настраиваются отдельно после запуска HTTPS.

Документация: [автоматический HTTPS Caddy](https://caddyserver.com/docs/automatic-https), [проверка и reload](https://caddyserver.com/docs/command-line), [импорт конфигурации](https://caddyserver.com/docs/caddyfile/directives/import).
