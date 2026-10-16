/*
 * Loaded 3 seconds after the page (see loadDelayed in scripts.js), so none of this affects the
 * largest paint or interaction readiness. As on the current site: OneTrust cookie consent, the
 * three Google Tag Manager containers (which bring GA4 and Google Ads) and the chat widget.
 */

const CONFIG = {
  onetrust: {
    src: 'https://cdn-apac.onetrust.com/scripttemplates/otSDKStub.js',
    domainScript: '280ff691-ab58-4610-bccb-330a6a94ec40',
  },
  gtm: ['GTM-PDXBB9T', 'GTM-NZRTJC', 'GTM-ML57FLPX'],
  chat: {
    origin: 'https://genai-api.thaiairways.com',
    src: 'https://genai-api.thaiairways.com/api/tg-social/v1/omni-channel/webchat#/?token=&lang={lang}',
    title: 'Chat Widget',
  },
};

/** The page is inside Universal Editor or another frame: no consent banner, tags or chat. */
const inFrame = window.self !== window.top;

/** The airline app's in-app browser: the current site skips Tag Manager there. */
function isAppWebView() {
  const ua = navigator.userAgent;
  return /wv|WebView/i.test(ua)
    && (/Android/i.test(ua) || (!/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua)));
}

function addScript(src, attrs = {}) {
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  Object.entries(attrs).forEach(([name, value]) => script.setAttribute(name, value));
  document.head.append(script);
  return script;
}

/** OneTrust cookie consent; its banner and preference centre come from the domain script. */
function loadConsent() {
  // OneTrust calls this after consent changes; tags react through Tag Manager
  window.OptanonWrapper = window.OptanonWrapper || (() => {});
  addScript(CONFIG.onetrust.src, {
    charset: 'UTF-8',
    'data-domain-script': CONFIG.onetrust.domainScript,
    'data-document-language': 'true',
  });
}

function loadTagManager() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  CONFIG.gtm.forEach((id) => addScript(`https://www.googletagmanager.com/gtm.js?id=${id}`));
}

/**
 * The chat widget: a launcher bubble in the bottom-right corner. When the chat opens it tells
 * the page (BUBBLE_CHAT_OPENED) and the frame grows to a panel, full screen on small screens.
 */
function loadChat() {
  const [lang] = (document.documentElement.lang || 'en').split('-');
  const frame = document.createElement('iframe');
  frame.className = 'chat-widget';
  frame.src = CONFIG.chat.src.replace('{lang}', encodeURIComponent(lang.toLowerCase()));
  frame.title = CONFIG.chat.title;
  frame.allow = 'microphone';
  frame.loading = 'lazy';
  document.body.append(frame);

  window.addEventListener('message', (e) => {
    if (e.origin !== CONFIG.chat.origin || e.source !== frame.contentWindow) return;
    let type = '';
    try {
      ({ type = '' } = typeof e.data === 'string' ? JSON.parse(e.data) : e.data || {});
    } catch { return; }
    if (/OPENED$/.test(type)) frame.classList.add('is-open');
    else if (/CLOSED$|MINIMI[SZ]ED$/.test(type)) frame.classList.remove('is-open');
  });
}

if (!inFrame) {
  loadConsent();
  if (!isAppWebView()) loadTagManager();
  loadChat();
}
