# Обновить сайт на действующем VPS

Новая версия содержит все 8 фотографий, информацию об AcePlace в Ансане, пять зон, тарифы и условия бронирования, парковку и правила на русском и корейском. Конфигурация и контейнеры бота не меняются.

Архив уже подготовлен: `output/aceplace-website-update.tar.gz`. Он содержит только публичные файлы сайта, без конфигурации Caddy и секретов.

## 1. Загрузить с Windows — PowerShell

```powershell
scp 'C:\Users\User\Documents\ChatGPT\Проект для Брата Ace Place\website\output\aceplace-website-update.tar.gz' root@151.243.177.216:/opt/ace-place-web/site-files.tar.gz
```

## 2. Распаковать на VPS — SSH / Bash

```bash
cd /opt/ace-place-web
tar -czf "site-backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C public .
tar -xzf site-files.tar.gz -C public
curl -I http://127.0.0.1/
```

Если уже подключён домен с перенаправлением на HTTPS, ответ 308 на последнюю команду нормален; проверьте также `curl -I https://ВАШ-ДОМЕН`.

Откройте сайт и нажмите Ctrl+F5. Перезапуск Caddy и бота не нужен. Не загружайте начальный Caddyfile: это могло бы заменить вашу настройку домена.

Для последующих обновлений заново соберите архив из актуальных файлов на Windows:

```powershell
$aceWebsite = 'C:\Users\User\Documents\ChatGPT\Проект для Брата Ace Place\website'
tar -czf "$aceWebsite\output\aceplace-website-update.tar.gz" -C "$aceWebsite\dist" .
```
