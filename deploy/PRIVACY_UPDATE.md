# Публикация политики конфиденциальности на VPS

Страница подготовлена на русском, корейском и английском языках. Внизу главной страницы добавлена ссылка. Контакт по вопросам данных — публичный телефон AcePlace: 010-7735-1994. Текст находится в `dist/privacy.html`, переключение языков — в `dist/privacy.js`, оформление — в `dist/privacy.css`.

## Загрузка через MobaXterm

1. Подключитесь к VPS `151.243.177.216` как обычно.
2. В левой панели SFTP откройте `/opt/ace-place-web`.
3. Перетащите туда подготовленный на компьютере архив `output/aceplace-privacy-update.tar.gz` из папки проекта бота.
4. Выполните в терминале VPS:

```bash
cd /opt/ace-place-web
tar -tzf aceplace-privacy-update.tar.gz
tar -xzf aceplace-privacy-update.tar.gz -C public
chmod 644 public/privacy.html public/privacy.css public/privacy.js public/index.html public/app.js public/beige.css public/content.js
curl -fsS -o /dev/null -w 'Policy HTTP %{http_code}\n' https://aceplace.kr/privacy.html
curl -fsS https://aceplace.kr/ | grep -o 'href="privacy.html"'
```

Ожидается `Policy HTTP 200` и `href="privacy.html"`. Архив содержит только семь файлов сайта: `privacy.html`, `privacy.css`, `privacy.js`, `index.html`, `app.js`, `beige.css`, `content.js`. Изменение `content.js` также убирает ранее запрошенное упоминание вместимости парковки в 1000 машин. Конфигурация сайта, фотографии, настройки Caddy, бот и база данных этим архивом не заменяются.

Перезапуск контейнера не требуется: Caddy читает файлы из примонтированной папки `public`. Откройте https://aceplace.kr/privacy.html и обновите главную страницу с Ctrl+F5. Проверьте RU/KO/EN, ссылку внизу сайта и кнопку возврата на сайт.

## Google Auth Platform → Branding

После загрузки и проверки страницы укажите:

- Application home page: `https://aceplace.kr/`
- Application privacy policy link: `https://aceplace.kr/privacy.html`
- Authorized domains: `aceplace.kr` — без протокола и пути.

Служебная почта указывается вашим действующим адресом в соответствующем поле Google. Она не добавлена на публичную страницу без отдельного указания владельца. Если Google запросит подтверждение домена, подтвердите владение через Search Console. Наличие страницы само по себе не переводит OAuth-приложение в Production и не завершает проверку Google.

## Повторная сборка архива на Windows

Из корня проекта бота:

```powershell
New-Item -ItemType Directory -Force output | Out-Null
tar -czf output/aceplace-privacy-update.tar.gz -C website/dist privacy.html privacy.css privacy.js index.html app.js beige.css content.js
tar -tzf output/aceplace-privacy-update.tar.gz
```
