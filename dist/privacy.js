'use strict';
(() => {
  const titles = {ru:'Политика конфиденциальности',ko:'개인정보 처리방침',en:'Privacy policy'};
  const articles = [...document.querySelectorAll('[data-policy-language]')];
  const links = [...document.querySelectorAll('[data-language]')];
  function select(language) {
    if (!Object.hasOwn(titles, language)) return;
    document.documentElement.lang = language;
    document.title = titles[language] + ' — AcePlace';
    articles.forEach(article => {article.hidden = article.dataset.policyLanguage !== language;});
    links.forEach(link => {
      if (link.dataset.language === language) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
    try {localStorage.setItem('ace-language',language);} catch {}
  }
  let language = 'ru';
  try {
    const stored = localStorage.getItem('ace-language');
    if (Object.hasOwn(titles,stored)) language = stored;
  } catch {}
  const fromHash = location.hash.slice(1);
  if (Object.hasOwn(titles,fromHash)) language = fromHash;
  select(language);
  links.forEach(link => link.addEventListener('click',event => {
    event.preventDefault();
    select(link.dataset.language);
    history.replaceState(null,'','#' + link.dataset.language);
  }));
  window.addEventListener('hashchange',() => select(location.hash.slice(1)));
})();
