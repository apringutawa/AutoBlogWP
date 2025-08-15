/*****************************************************
 * AUTO BLOG WORDPRESS — Monitoring First (Fixed)
 * RSS/Atom → Scrape → Gemini 2.5 (v1, rotate/fallback)
 * → Image (rotate Pexels→Pixabay→Unsplash)
 * → Monetisasi → Taxonomy Mapping → Post WordPress
 * Sheet: AutoBlog (ringan) + Content (HTML)
 * FIX: RSS_FEEDS robust (CSV/newline/JSON), sanitize URL,
 *      validasi http(s), no [Ljava.lang.Object;@... lagi
 *****************************************************/

/* ========= DEFAULT CONFIG (fallback jika Script Properties kosong) ========= */
const CONFIG = {
  WORDPRESS_SITE: 'https://abangapple.com',
  WORDPRESS_USER: '089657458383',
  WORDPRESS_PASSWORD: 'lNh2 IrGy E94e bbrd Xai4 Yu8S',

  GEMINI_API_KEY: 'AIzaSyDRGrvd8NVc8L0vqZb7Pe31s7iWLkILplE',
  PEXELS_API_KEY: '6zuz4CnHwBdi0Fix7OE9WZWePKqVZplklazXCx8NQcnEdTtfhb3qrJ3x',
  PIXABAY_API_KEY: '48244362-c6612cd58fe30235184444bbf',
  UNSPLASH_API_KEY: 'UNSPLASH_KEY',
 
 
  SHEET_NAME: 'AutoBlog',
  CONTENT_SHEET: 'Content',
  RSS_FEEDS: [
    
'https://www.engadget.com/rss.xml',
'https://techcrunch.com/category/gadgets/feed/',
'https://www.cnet.com/rss/news/',
'https://www.theverge.com/rss/index.xml',
'https://www.ubergizmo.com/rss-ubergizmo/',
'https://gadgetstouse.com/feed',
'https://geeky-gadgets.com/category/gadgets/feed/',
'https://the-gadgeteer.com/feed',
'https://gadgetsalvation.com/blog/feed',
'https://cutetechgadgets.com/feed',
'https://techinasia.com/tag/indonesia/feed/',
'https://jagatreview.com/feed/',
'https://news.detik.com/berita/rss',
'https://www.cnbcindonesia.com/tech/rss',
'https://lapi.kumparan.com/v2.0/rss/',
'https://www.suara.com/rss/tekno',
'https://www.cnnindonesia.com/teknologi/rss',
'https://rss.kontan.co.id/news/tekno',
'https://tirto.id/sitemap/r/google-discover',
'https://feed.liputan6.com'
    
  ],

  // Limit
  RUN_POST_LIMIT: '3',      // per-run
  DAILY_POST_LIMIT: '10',    // per date

  // Monetisasi
  ADSENSE_SNIPPET_TOP: '<div class="adsense-slot"><!-- TOP --></div>',
  ADSENSE_SNIPPET_BOTTOM: '<div class="adsense-slot"><!-- BOTTOM --></div>',
  SHOPEE_AFF_ENABLED: 'true',
  SHOPEE_AFF_BASE: 'https://shopee.co.id/search?keyword=',
  SHOPEE_AFF_SUFFIX: '&affiliate_id=YOUR_AFF_ID',
  SHOPEE_INSERT_BEFORE_H2: 'true',

  // Rotasi AI & Gambar
  AI_ROTATION: 'rotate',          // rotate | fallback | random
  AI_MODELS: 'gemini-2.5-flash,gemini-2.5-pro',
  ROT_IDX_AI: '0',
  IMAGE_ROTATION: 'rotate',       // rotate | chain | random
  IMAGE_PROVIDERS: 'pexels,pixabay,unsplash',
  ROT_IDX_IMAGE: '0',

  // Taxonomy
  TAXONOMY_SOURCE: 'props',       // props | sheet
  TAXONOMY_JSON: JSON.stringify({
    "iphone":  { "categories": [12], "tags": ["iPhone","iOS","A17"] },
    "macbook": { "categories": [34], "tags": ["MacBook","macOS","M-series"] },
    "ipad":    { "categories": [56], "tags": ["iPad","iPadOS","Apple Pencil"] },
    "apple watch": {"categories":[78],"tags":["Apple Watch","watchOS","Wearable"]}
  })
};

/* ========= UTIL: Script Properties & Helpers ========= */
function prop(key, fallback) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (v === null || v === undefined || v === '') {
    if (CONFIG.hasOwnProperty(key)) return CONFIG[key];
    return fallback;
  }
  return v;
}
function tz() { return Session.getScriptTimeZone() || 'Asia/Pontianak'; }
function ymd(d){ return Utilities.formatDate(d, tz(), 'yyyy-MM-dd'); }
function nowStr(){ return Utilities.formatDate(new Date(), tz(), 'yyyy-MM-dd HH:mm:ss'); }
function sleep(ms){ Utilities.sleep(ms); }
function ensureHtml(s) {
  const looksLikeHtml = /<\/?(p|h2|h3|ul|ol|li|strong|em|a)\b/i.test(s);
  if (looksLikeHtml) return s;
  return `<p>${String(s).replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>')}</p>`;
}
function nextRotIndex(propKey, length){
  const ps = PropertiesService.getScriptProperties();
  const cur = parseInt(ps.getProperty(propKey) || '0',10) || 0;
  const nxt = (cur + 1) % Math.max(1,length);
  ps.setProperty(propKey, String(nxt));
  return cur % Math.max(1,length);
}

/* ========= SHEETS ========= */
function getMainSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(prop('SHEET_NAME', 'AutoBlog'));
  if (!sh) throw new Error("Sheet 'AutoBlog' belum dibuat. Jalankan setupSheets().");
  return sh;
}
function getContentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(prop('CONTENT_SHEET','Content'));
  if (!sh) throw new Error("Sheet 'Content' belum dibuat. Jalankan setupSheets().");
  return sh;
}

/* ========= SETUP TABEL & FORMAT ========= */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // MAIN
  let sh = ss.getSheetByName(prop('SHEET_NAME','AutoBlog'));
  if (!sh) sh = ss.insertSheet(prop('SHEET_NAME','AutoBlog'));
  const headers = ['Timestamp','Topic','SourceURL','Feed','Domain','Status','LastAttempt','Retry','ErrorLog','AIProvider','AI Words','ImgProvider','ImageURL','PostedDate','PostURL','Categories','Tags','PostID','MediaID','ContentLink','DailyKey'];
  sh.clear();
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange('A1:U1').setBackground('#1a73e8').setFontColor('white').setFontWeight('bold');
  sh.autoResizeColumns(1, headers.length);
  sh.getRange(2,1,Math.max(1,sh.getMaxRows()-1),headers.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Processing','Posted','Error','Skipped'], true).build();
  sh.getRange('F2:F').setDataValidation(rule);
  const rules = sh.getConditionalFormatRules();
  rules.push(
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Pending').setBackground('#fff3cd').setRanges([sh.getRange('F2:F')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Processing').setBackground('#cfe2ff').setRanges([sh.getRange('F2:F')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Posted').setBackground('#d1e7dd').setRanges([sh.getRange('F2:F')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Error').setBackground('#f8d7da').setRanges([sh.getRange('F2:F')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Skipped').setBackground('#e2e3e5').setRanges([sh.getRange('F2:F')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#ffe8a1').setRanges([sh.getRange('H2:H')]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEN($I2)>0').setFontColor('#dc3545').setBold(true).setRanges([sh.getRange('I2:I')]).build()
  );
  sh.setConditionalFormatRules(rules);
  sh.getRange(1,1,sh.getMaxRows(),headers.length).createFilter();
  sh.setColumnWidths(1,1,140);
  sh.setColumnWidths(2,1,260);
  sh.setColumnWidths(3,1,280);
  sh.setColumnWidths(10,1,100);
  sh.setColumnWidths(11,1,80);
  sh.setColumnWidths(12,1,110);
  sh.setColumnWidths(20,1,110);

  // CONTENT
  let ch = ss.getSheetByName(prop('CONTENT_SHEET','Content'));
  if (!ch) ch = ss.insertSheet(prop('CONTENT_SHEET','Content'));
  ch.clear();
  ch.getRange(1,1,1,4).setValues([['ContentID','Timestamp','Topic','HTML']]);
  ch.setFrozenRows(1);
  ch.getRange('A1:D1').setBackground('#6c757d').setFontColor('white').setFontWeight('bold');
  ch.autoResizeColumns(1,4);

  // DASHBOARD
  let dh = ss.getSheetByName('Dashboard');
  if (!dh) dh = ss.insertSheet('Dashboard');
  dh.clear();
  dh.getRange(1,1,1,2).setValues([['Metric','Value']]).setBackground('#0d6efd').setFontColor('white').setFontWeight('bold');
  dh.getRange(2,1,5,2).setValues([
    ['Posted Today','=COUNTIFS(AutoBlog!F:F,"Posted",AutoBlog!N:N,TODAY())'],
    ['Pending','=COUNTIF(AutoBlog!F:F,"Pending")'],
    ['Processing','=COUNTIF(AutoBlog!F:F,"Processing")'],
    ['Error','=COUNTIF(AutoBlog!F:F,"Error")'],
    ['Total Rows','=COUNTA(AutoBlog!A:A)-1']
  ]);
  dh.autoResizeColumns(1,2);

  Logger.log('Sheets siap. Jalankan seedScriptProperties() untuk kunci/opsi.');
}

/* ========= HEADER INDEX HELPER ========= */
function getIndexMap() {
  const sh = getMainSheet();
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const idxOf = k => headers.indexOf(k);
  return {
    ts: idxOf('Timestamp'),
    topic: idxOf('Topic'),
    src: idxOf('SourceURL'),
    feed: idxOf('Feed'),
    domain: idxOf('Domain'),
    status: idxOf('Status'),
    lastAttempt: idxOf('LastAttempt'),
    retry: idxOf('Retry'),
    err: idxOf('ErrorLog'),
    ai: idxOf('AIProvider'),
    aiw: idxOf('AI Words'),
    imgProv: idxOf('ImgProvider'),
    imgUrl: idxOf('ImageURL'),
    posted: idxOf('PostedDate'),
    postUrl: idxOf('PostURL'),
    cats: idxOf('Categories'),
    tags: idxOf('Tags'),
    postId: idxOf('PostID'),
    mediaId: idxOf('MediaID'),
    contentLink: idxOf('ContentLink'),
    dailyKey: idxOf('DailyKey')
  };
}

/* ========= RSS helpers (robust) ========= */
function sanitizeFeedUrl(x){
  let s = String(x || '').trim();
  if (!s) return '';
  // buang quote pembungkus
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1,-1).trim();
  }
  // hilangkan whitespace tak terlihat (ZWSP, NBSP, dll)
  s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
  // buang jejak object Java
  if (/\[Ljava\.lang\.Object;@/i.test(s)) return '';
  return s;
}
function isValidHttpUrl(s){
  const str = String(s || '').trim();
  return /^https?:\/\/[^\s"']+$/i.test(str);
}
function getConfigFeeds() {
  const any = prop('RSS_FEEDS', null);
  let arr = [];
  if (!any) {
    arr = CONFIG.RSS_FEEDS.slice();
  } else if (Array.isArray(any)) {
    arr = any.map(sanitizeFeedUrl);
  } else if (typeof any === 'string') {
    const raw = any.trim();
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) arr = parsed.map(sanitizeFeedUrl);
      } catch(e){ /* fallback below */ }
    }
    if (arr.length === 0) {
      arr = raw.split(/[\n,;]+/).map(sanitizeFeedUrl);
    }
  }
  // validasi & dedup
  const set = new Set();
  arr.forEach(u => { if (isValidHttpUrl(u)) set.add(u); });
  if (set.size === 0) CONFIG.RSS_FEEDS.forEach(u => set.add(u));
  return Array.from(set);
}
function parseFeed(xmlStr) {
  const out = [];
  try {
    const doc = XmlService.parse(xmlStr);
    const root = doc.getRootElement();
    const name = root.getName().toLowerCase();
    if (name === 'rss') {
      const ch = root.getChild('channel');
      if (!ch) return out;
      const feedTitle = ch.getChildText('title') || '';
      ch.getChildren('item').forEach(item => {
        out.push({
          title: item.getChildText('title'),
          link: item.getChildText('link'),
          feed: feedTitle
        });
      });
      return out;
    }
    if (name === 'feed') { // Atom
      const feedTitle = root.getChildText('title') || '';
      root.getChildren('entry').forEach(en => {
        const linkEl = en.getChildren('link')[0];
        const href = linkEl && linkEl.getAttribute('href') ? linkEl.getAttribute('href').getValue() : '';
        out.push({
          title: en.getChildText('title'),
          link: href,
          feed: feedTitle
        });
      });
      return out;
    }
  } catch(e){ console.error('parseFeed error: '+e); }
  return out;
}
function domainFromUrl(u) { try { return new URL(u).hostname.replace(/^www\./,''); } catch(e){ return ''; } }
function fetchAndSaveNews() {
  const sh = getMainSheet();
  const idx = getIndexMap();
  const last = sh.getLastRow();
  const existing = new Set(last>1 ? sh.getRange(2, idx.src+1, last-1, 1).getValues().flat().filter(Boolean) : []);
  const feeds = getConfigFeeds();

  feeds.forEach(raw => {
    const feedUrl = sanitizeFeedUrl(raw);

    if (!isValidHttpUrl(feedUrl)) {
      console.log('Skip invalid feed (format):', feedUrl);
      return;
    }

    try {
      const resp = UrlFetchApp.fetch(feedUrl, { muteHttpExceptions: true, followRedirects: true });
      const code = resp.getResponseCode();
      if (code >= 400) throw new Error('HTTP ' + code);

      const text = resp.getContentText();
      const items = parseFeed(text);

      if (!items || !items.length) {
        console.log('No items parsed from feed:', feedUrl);
        return;
      }

      const rows = [];
      items.forEach(it => {
        if (!it.link || !isValidHttpUrl(it.link) || existing.has(it.link)) return;
        rows.push([
          new Date(),
          it.title || '(no title)',
          it.link,
          it.feed || '',
          domainFromUrl(it.link),
          'Pending', '', 0, '', '', '', '', '', '', '', '', '', '', '', '',
          ymd(new Date())
        ]);
        existing.add(it.link);
      });

      if (rows.length) {
        sh.getRange(sh.getLastRow()+1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        console.log('Parsed but nothing to add (duplicates/invalid links):', feedUrl);
      }

    } catch (e) {
      console.error('Feed error ' + feedUrl + ': ' + e);
    }
  });
}

/* ========= SCRAPE RINGAN ========= */
function fetchReadableText(url) {
  try {
    const resp = UrlFetchApp.fetch(url, {muteHttpExceptions:true, followRedirects:true});
    if (resp.getResponseCode() >= 400) throw new Error('HTTP '+resp.getResponseCode());
    let html = resp.getContentText();
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi,'')
      .replace(/<style[\s\S]*?<\/style>/gi,'')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi,'')
      .replace(/<nav[\s\S]*?<\/nav>/gi,'')
      .replace(/<aside[\s\S]*?<\/aside>/gi,'');
    let body = (html.match(/<article[\s\S]*?>([\s\S]*?)<\/article>/i) || [])[1] || '';
    if (!body) body = (html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i) || [])[1] || '';
    if (!body) body = html;
    body = body.replace(/<(header|footer|figure|form|button|svg|iframe)[\s\S]*?<\/\1>/gi, '');
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g,' ').trim();
    return text.substring(0, 24000);
  } catch(e){ console.error('fetchReadableText: '+e); return ''; }
}

/* ========= ROTASI AI (Gemini 2.5) ========= */
function getAIModelsArray(){
  const raw = prop('AI_MODELS','gemini-2.5-flash,gemini-2.5-pro');
  return String(raw).split(',').map(s=>s.trim()).filter(Boolean);
}
function generateArticleWithGemini(topic, sourceUrl) {
  const apiKey = prop('GEMINI_API_KEY','');
  if (!apiKey) throw new Error('GEMINI_API_KEY kosong.');

  const srcText = fetchReadableText(sourceUrl);
  if (!srcText || srcText.length < 600) throw new Error('Konten sumber terlalu pendek/gagal scrape');

  const kw = (topic.split(' ')[0] || topic);
  const instr =
`Anda adalah editor teknologi. Tulis artikel berbahasa Indonesia berdasarkan ringkasan sumber di bawah ini.
- Judul: "${topic}"
- Panjang 800–1000 kata, SEO-friendly (keyword: "${kw}")
- Minimal 3 subjudul (H2/H3), akhiri dengan kesimpulan
- Output WAJIB HTML valid saja (p,h2,h3,ul,li,strong,em,a)
- Jangan sebut/ tempel URL sumber.

Ringkasan sumber:
${srcText}`;

  const mode = String(prop('AI_ROTATION','rotate')).toLowerCase();
  let models = getAIModelsArray();
  if (mode === 'rotate') {
    const start = nextRotIndex('ROT_IDX_AI', models.length);
    models = models.slice(start).concat(models.slice(0,start));
  } else if (mode === 'random') {
    models.sort(()=>Math.random()-0.5);
  }

  let lastRaw = '';
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      const payload = { contents: [{ parts: [{ text: instr }]}] };
      const opt = { method:'post', contentType:'application/json', payload: JSON.stringify(payload), muteHttpExceptions:true };
      const resp = UrlFetchApp.fetch(url, opt);
      const code = resp.getResponseCode();
      const raw = resp.getContentText();
      lastRaw = raw;
      if (code >= 400) { if ([400,404,429,500,503].includes(code)) continue; throw new Error(`Gemini HTTP ${code}: ${raw}`); }
      const data = JSON.parse(raw);
      let out = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!out) continue;
      out = ensureHtml(out).replace(/>\s*html\s*</gi,'><');
      return { html: out, modelUsed: model };
    } catch(e){ console.warn(`Model ${model} gagal: ${e}`); }
  }
  throw new Error('Semua model Gemini gagal. RAW: '+(lastRaw||'').slice(0,300));
}

/* ========= MONETISASI ========= */
function injectMonetization(html, title) {
  let out = html || '';
  const top = prop('ADSENSE_SNIPPET_TOP','');
  const bottom = prop('ADSENSE_SNIPPET_BOTTOM','');
  const shopeeEnabled = String(prop('SHOPEE_AFF_ENABLED','false')).toLowerCase()==='true';
  const insertBeforeH2 = String(prop('SHOPEE_INSERT_BEFORE_H2','true')).toLowerCase()==='true';

  if (top) out = top + '\n' + out;

  if (shopeeEnabled) {
    const base = prop('SHOPEE_AFF_BASE','https://shopee.co.id/search?keyword=');
    const suffix = prop('SHOPEE_AFF_SUFFIX','');
    const q = encodeURIComponent(title.replace(/Apple|Mac|iPhone|iPad|MacBook|iOS|M\d+/gi,'').trim() || 'iPhone');
    const url = `${base}${q}${suffix}`;
    const box =
      '<div class="aff-box" style="border:1px solid #e5e7eb;padding:12px;border-radius:12px;margin:16px 0">' +
      '<strong>Rekomendasi Produk Terkait:</strong><br>' +
      `Cek harga di Shopee ➜ <a href="${url}" target="_blank" rel="nofollow noopener">Klik di sini</a>` +
      '</div>';
    if (insertBeforeH2 && /<h2[^>]*>/i.test(out)) out = out.replace(/<h2[^>]*>/i, box + '\n<h2');
    else out = box + '\n' + out;
  }

  if (bottom) out = out + '\n' + bottom;
  return out;
}

/* ========= IMAGE ROTATION ========= */
function imgProvidersList(){
  const arr = String(prop('IMAGE_PROVIDERS','pexels,pixabay,unsplash')).split(',').map(s=>s.trim()).filter(Boolean);
  const filtered = arr.filter(p=>{
    if (p==='pexels') return !!prop('PEXELS_API_KEY','');
    if (p==='pixabay') return !!prop('PIXABAY_API_KEY','');
    if (p==='unsplash') return !!prop('UNSPLASH_API_KEY','');
    return false;
  });
  return filtered.length ? filtered : arr;
}
function fetchImageFromProvider(provider, topic){
  try {
    if (provider==='pexels') {
      const key = prop('PEXELS_API_KEY',''); if (!key) return '';
      const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic)}&per_page=5`;
      const r = UrlFetchApp.fetch(u, { headers:{ Authorization:key }, muteHttpExceptions:true });
      if (r.getResponseCode()===200) {
        const d = JSON.parse(r.getContentText());
        const ph = d.photos && d.photos[0];
        if (ph && ph.src) return ph.src.large2x || ph.src.original || ph.src.medium || '';
      }
    }
    if (provider==='pixabay') {
      const key = prop('PIXABAY_API_KEY',''); if (!key) return '';
      const u = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(topic)}&image_type=photo&per_page=5&safesearch=true&order=popular`;
      const r = UrlFetchApp.fetch(u, { muteHttpExceptions:true });
      if (r.getResponseCode()===200) {
        const d = JSON.parse(r.getContentText());
        if (d.hits && d.hits.length) {
          const img = d.hits.find(h => h.imageWidth >= 1200) || d.hits[0];
          return img.largeImageURL || img.webformatURL || '';
        }
      }
    }
    if (provider==='unsplash') {
      const key = prop('UNSPLASH_API_KEY',''); if (!key) return '';
      const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=5&orientation=landscape&client_id=${key}`;
      const r = UrlFetchApp.fetch(u, { muteHttpExceptions:true });
      if (r.getResponseCode()===200) {
        const d = JSON.parse(r.getContentText());
        if (d.results && d.results.length) {
          const img = d.results.find(x => x.width >= 1200) || d.results[0];
          return (img.urls && (img.urls.regular || img.urls.full)) || '';
        }
      }
    }
  } catch(e){ console.error('fetchImageFromProvider '+provider+': '+e); }
  return '';
}
// kompatibel dgn nama lama:
function getImageFromPexels(topic){
  const mode = String(prop('IMAGE_ROTATION','rotate')).toLowerCase();
  const providers = imgProvidersList();
  let order = [...providers];
  if (mode==='rotate') {
    const start = nextRotIndex('ROT_IDX_IMAGE', providers.length);
    order = providers.slice(start).concat(providers.slice(0,start));
  } else if (mode==='random') {
    order.sort(()=>Math.random() - 0.5);
  } // 'chain' → urutan asli
  for (const p of order) {
    const url = fetchImageFromProvider(p, topic);
    if (url) return { url, provider: p };
  }
  return { url:'', provider:'' };
}

/* ========= TAXONOMY (kategori & tag otomatis) ========= */
function loadTaxonomyMap(){
  const src = String(prop('TAXONOMY_SOURCE','props')).toLowerCase();
  if (src==='sheet') return loadTaxonomyFromSheet();
  return loadTaxonomyFromProps();
}
function loadTaxonomyFromProps(){
  try {
    const raw = prop('TAXONOMY_JSON','{}');
    const obj = JSON.parse(raw);
    const norm = {};
    Object.keys(obj).forEach(k=>{
      norm[k.toLowerCase()] = {
        categories: (obj[k].categories || []).map(Number).filter(n=>!isNaN(n)),
        catNames:   (obj[k].catNames || []),
        tags:       (obj[k].tags || [])
      };
    });
    return norm;
  } catch(e){ console.error('loadTaxonomyFromProps: '+e); return {}; }
}
function loadTaxonomyFromSheet(){
  const sh = SpreadsheetApp.getActive().getSheetByName('Taxonomy');
  if (!sh) return {};
  const last = sh.getLastRow();
  if (last < 2) return {};
  const rows = sh.getRange(2,1,last-1,4).getValues();
  const map = {};
  rows.forEach(([keyword, catIdsCSV, catNamesCSV, tagsCSV])=>{
    if (!keyword) return;
    const k = String(keyword).toLowerCase().trim();
    const catIds = (catIdsCSV ? String(catIdsCSV).split(',').map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)) : []);
    const catNames = (catNamesCSV ? String(catNamesCSV).split(',').map(s=>s.trim()).filter(Boolean) : []);
    const tags = (tagsCSV ? String(tagsCSV).split(',').map(s=>s.trim()).filter(Boolean) : []);
    map[k] = { categories: catIds, catNames, tags };
  });
  return map;
}
function getOrCreateCategoryId(catName){
  try {
    const site = prop('WORDPRESS_SITE', CONFIG.WORDPRESS_SITE);
    const auth = Utilities.base64Encode(`${prop('WORDPRESS_USER', CONFIG.WORDPRESS_USER)}:${prop('WORDPRESS_PASSWORD', CONFIG.WORDPRESS_PASSWORD)}`);
    let res = UrlFetchApp.fetch(`${site}/wp-json/wp/v2/categories?search=${encodeURIComponent(catName)}`, { method:'get', headers:{ Authorization:`Basic ${auth}` }, muteHttpExceptions:true });
    if (res.getResponseCode()===200) {
      const arr = JSON.parse(res.getContentText());
      if (arr.length && arr[0].id) return arr[0].id;
    }
    res = UrlFetchApp.fetch(`${site}/wp-json/wp/v2/categories`, {
      method:'post', contentType:'application/json',
      headers:{ Authorization:`Basic ${auth}` },
      payload: JSON.stringify({ name: catName }), muteHttpExceptions:true
    });
    if (res.getResponseCode()===201) {
      const d = JSON.parse(res.getContentText());
      return d.id || 1;
    }
  } catch(e){ console.error('getOrCreateCategoryId: '+e); }
  return 1;
}
function getOrCreateTagId(tagName){
  try {
    const site = prop('WORDPRESS_SITE', CONFIG.WORDPRESS_SITE);
    const auth = Utilities.base64Encode(`${prop('WORDPRESS_USER', CONFIG.WORDPRESS_USER)}:${prop('WORDPRESS_PASSWORD', CONFIG.WORDPRESS_PASSWORD)}`);
    let r = UrlFetchApp.fetch(`${site}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, { method:'get', headers:{ Authorization:`Basic ${auth}` }, muteHttpExceptions:true });
    if (r.getResponseCode()===200) {
      const arr = JSON.parse(r.getContentText());
      if (arr.length && arr[0].id) return arr[0].id;
    }
    r = UrlFetchApp.fetch(`${site}/wp-json/wp/v2/tags`, {
      method:'post', contentType:'application/json',
      headers:{ Authorization:`Basic ${auth}` },
      payload: JSON.stringify({ name: tagName }), muteHttpExceptions:true
    });
    if (r.getResponseCode()===201) {
      const d = JSON.parse(r.getContentText());
      return d.id || 1;
    }
  } catch(e){ console.error('getOrCreateTagId: '+e); }
  return 1;
}
function resolveCategoriesAndTags(topic, contentHtml){
  const map = loadTaxonomyMap();
  const text = (topic + ' ' + contentHtml.replace(/<[^>]+>/g,' ')).toLowerCase();
  let catIds = new Set(), tagNames = new Set();
  Object.keys(map).forEach(key=>{
    if (text.includes(key)) {
      const entry = map[key];
      (entry.categories||[]).forEach(id=>catIds.add(id));
      (entry.tags||[]).forEach(t=>tagNames.add(t));
      (entry.catNames||[]).forEach(n=>catIds.add(getOrCreateCategoryId(n)));
    }
  });
  if (catIds.size===0) catIds.add(1);
  if (tagNames.size===0) (topic.match(/\b(iPhone|MacBook|iPad|Apple Watch|iOS|macOS)\b/gi)||[]).forEach(t=>tagNames.add(t));
  return { categories: Array.from(catIds).slice(0,3), tags: Array.from(tagNames).slice(0,8) };
}

/* ========= WORDPRESS ========= */
function uploadImageToWordPress(imageUrl, title) {
  if (!imageUrl) return null;
  try {
    const blob = UrlFetchApp.fetch(imageUrl, {muteHttpExceptions:true}).getBlob();
    const apiUrl = `${prop('WORDPRESS_SITE', CONFIG.WORDPRESS_SITE)}/wp-json/wp/v2/media`;
    const auth = Utilities.base64Encode(`${prop('WORDPRESS_USER', CONFIG.WORDPRESS_USER)}:${prop('WORDPRESS_PASSWORD', CONFIG.WORDPRESS_PASSWORD)}`);
    const opt = {
      method:'post',
      contentType: blob.getContentType() || 'image/jpeg',
      headers:{ Authorization:`Basic ${auth}`, 'Content-Disposition': `attachment; filename="${encodeURIComponent(title)}.jpg"` },
      payload: blob.getBytes(), muteHttpExceptions:true
    };
    const resp = UrlFetchApp.fetch(apiUrl, opt);
    if (resp.getResponseCode()!==201) { console.error('WP media: '+resp.getContentText().slice(0,300)); return null; }
    const json = JSON.parse(resp.getContentText());
    return json.id || null;
  } catch(e){ console.error('uploadImageToWordPress: '+e); return null; }
}
function postToWordPress(title, content, mediaId, categoryIds, tagNames) {
  const site = prop('WORDPRESS_SITE', CONFIG.WORDPRESS_SITE);
  const url = `${site}/wp-json/wp/v2/posts`;
  const tagIds = (tagNames||[]).map(n=>getOrCreateTagId(n)).filter(Boolean);
  const payload = { title, content, status:'publish', categories: (categoryIds&&categoryIds.length)?categoryIds:[1], tags: tagIds };
  if (mediaId) payload.featured_media = mediaId;
  const auth = Utilities.base64Encode(`${prop('WORDPRESS_USER', CONFIG.WORDPRESS_USER)}:${prop('WORDPRESS_PASSWORD', CONFIG.WORDPRESS_PASSWORD)}`);
  const res = UrlFetchApp.fetch(url, { method:'post', contentType:'application/json', headers:{ Authorization:`Basic ${auth}` }, payload: JSON.stringify(payload), muteHttpExceptions:true });
  if (res.getResponseCode()!==201) throw new Error((JSON.parse(res.getContentText()).message) || ('WP failed '+res.getResponseCode()));
  return JSON.parse(res.getContentText());
}

/* ========= CONTENT STORAGE ========= */
function storeContentAndLink(mainRow, topic, html) {
  const ch = getContentSheet();
  const cid = ch.getLastRow(); // ID sederhana = indeks baris sebelumnya
  const row = cid + 1;
  ch.getRange(row,1,1,4).setValues([[cid, new Date(), topic, html]]);
  const sh = getMainSheet();
  const gid = ch.getSheetId();
  const link = `=HYPERLINK("#gid=${gid}&range=A${row}", "Open")`;
  const idx = getIndexMap();
  sh.getRange(mainRow, idx.contentLink+1).setFormula(link);
  return { contentId: cid, link };
}
function htmlWordCount(html){
  const text = String(html).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return text ? text.split(' ').filter(Boolean).length : 0;
}

/* ========= LIMITS ========= */
function getDailyPostedCount(dateObj=new Date()) {
  const sh = getMainSheet();
  const idx = getIndexMap();
  const last = sh.getLastRow();
  if (last<2) return 0;
  const rng = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  const key = ymd(dateObj);
  let cnt = 0;
  rng.forEach(r=>{
    if (String(r[idx.status]).toLowerCase()==='posted' && r[idx.posted]) {
      if (ymd(new Date(r[idx.posted]))===key) cnt++;
    }
  });
  return cnt;
}

/* ========= PROSES PENDING ========= */
function processPendingPosts() {
  const sh = getMainSheet();
  const idx = getIndexMap();
  const dailyLimit = parseInt(prop('DAILY_POST_LIMIT', CONFIG.DAILY_POST_LIMIT),10) || 3;
  const runLimit   = parseInt(prop('RUN_POST_LIMIT',   CONFIG.RUN_POST_LIMIT),10) || 3;

  let postedToday = getDailyPostedCount(new Date());
  if (postedToday >= dailyLimit) { console.log('Daily limit reached'); return; }

  const last = sh.getLastRow();
  if (last<2) return;

  const data = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  let postedThisRun = 0;

  for (let i=0; i<data.length; i++) {
    if (postedThisRun>=runLimit || postedToday>=dailyLimit) break;

    const r = data[i];
    if (r[idx.status] !== 'Pending') continue;

    const rowNum = i+2; // row nyata
    const topic = r[idx.topic];
    const src = r[idx.src];

    try {
      if (!topic || !src) throw new Error('Topic/SourceURL kosong');

      // status & last attempt
      sh.getRange(rowNum, idx.status+1).setValue('Processing');
      sh.getRange(rowNum, idx.lastAttempt+1).setValue(nowStr());

      // 1) Generate artikel + provider
      const { html, modelUsed } = generateArticleWithGemini(topic, src);
      const finalHTML = injectMonetization(html, topic);
      const { contentId } = storeContentAndLink(rowNum, topic, finalHTML);
      sh.getRange(rowNum, idx.ai+1).setValue(modelUsed);
      sh.getRange(rowNum, idx.aiw+1).setValue(htmlWordCount(finalHTML));

      // 2) Gambar (rotasi)
      const img = getImageFromPexels(topic);
      if (img.url) {
        sh.getRange(rowNum, idx.imgUrl+1).setValue(img.url);
        sh.getRange(rowNum, idx.imgProv+1).setValue(img.provider);
      }

      // 3) Taxonomy mapping
      const { categories, tags } = resolveCategoriesAndTags(topic, finalHTML);
      if (categories.length) sh.getRange(rowNum, idx.cats+1).setValue(categories.join(','));
      if (tags.length) sh.getRange(rowNum, idx.tags+1).setValue(tags.join(','));

      // 4) Upload & post
      const mediaId = img.url ? uploadImageToWordPress(img.url, topic) : null;
      const wpRes = postToWordPress(topic, finalHTML, mediaId, categories, tags);

      // 5) Update hasil
      sh.getRange(rowNum, idx.status+1).setValue('Posted');
      sh.getRange(rowNum, idx.posted+1).setValue(new Date());
      sh.getRange(rowNum, idx.postUrl+1).setValue(wpRes.link);
      sh.getRange(rowNum, idx.postId+1).setValue(wpRes.id || '');
      sh.getRange(rowNum, idx.mediaId+1).setValue(mediaId || '');
      sh.getRange(rowNum, idx.err+1).setValue('');

      postedThisRun++; postedToday++;
      sleep(1200);
    } catch(e) {
      const retryVal = Number(sh.getRange(rowNum, idx.retry+1).getValue() || 0) + 1;
      sh.getRange(rowNum, idx.retry+1).setValue(retryVal);
      sh.getRange(rowNum, idx.status+1).setValue('Error');
      sh.getRange(rowNum, idx.err+1).setValue(`[${nowStr()}] ${e && e.stack ? e.stack : e}`);
      console.error('Row '+rowNum+' error: '+e);
    }
  }
}

/* ========= MAIN JOB ========= */
function autoBlogSystem(){
  try {
    fetchAndSaveNews();
    processPendingPosts();
  } catch(e){ console.error('autoBlogSystem: '+e); }
}
function runAllNow(){ autoBlogSystem(); }

/* ========= TRIGGER ========= */
function setupDailyTrigger(){
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoBlogSystem').timeBased().everyHours(8).create(); // 3x/hari kira-kira
  return 'Trigger dibuat: setiap 8 jam.';
}

/* ========= Script Properties helper ========= */
function seedScriptProperties(){
  PropertiesService.getScriptProperties().setProperties(CONFIG, true);
  return 'Script Properties di-seed. Cek Project Settings → Script properties.';
}
function loadPropsFromSecretsSheet(){
  const sh = SpreadsheetApp.getActive().getSheetByName('Secrets');
  if (!sh) throw new Error("Buat sheet 'Secrets' kolom A=Key, B=Value");
  const last = sh.getLastRow();
  if (last<2) throw new Error('Secrets kosong');
  const rows = sh.getRange(2,1,last-1,2).getValues();
  const map = {};
  rows.forEach(([k,v])=>{ if (k) map[String(k).trim()] = String(v||'').trim(); });
  PropertiesService.getScriptProperties().setProperties(map, true);
  return `Imported ${Object.keys(map).length} props dari Secrets.`;
}
function exportPropsToSecretsSheet(){
  const props = PropertiesService.getScriptProperties().getProperties();
  let sh = SpreadsheetApp.getActive().getSheetByName('Secrets');
  if (!sh) sh = SpreadsheetApp.getActive().insertSheet('Secrets');
  sh.clear();
  sh.getRange(1,1,1,2).setValues([['Key','Value']]);
  const body = Object.entries(props).map(([k,v])=>[k,v]);
  if (body.length) sh.getRange(2,1,body.length,2).setValues(body);
  return `Exported ${body.length} props ke Secrets.`;
}

/* ========= ONE-TIME: inisialisasi tampilan ========= */
function setupAll(){
  setupSheets();
  seedScriptProperties();
  return 'Setup selesai. Edit Script Properties sesuai kebutuhan.';
}

/* ========= DEBUG helper (opsional) ========= */
function debugListFeeds(){
  const feeds = getConfigFeeds();
  console.log('Feeds (after sanitize):', JSON.stringify(feeds, null, 2));
  feeds.forEach(u => console.log('Valid?', isValidHttpUrl(u), '—', u));
}
