const requiredCount = 20;
const articles = [];
const databaseName = 'writing-dna-workbench';
const storeName = 'workspace';
let reportMarkdown = '';
let aiPromptText = '';
let saveTimer;
let isDemoMode = false;
let onboardingStage = 'welcome';
let uploadSuccessTimer;
let jsZipPromise;
let demoArticlesPromise;
const numberFrames = new WeakMap();

const $ = (selector) => document.querySelector(selector);
const UI = window.WritingDNAComponents;
const fileInput = $('#fileInput');
const dropzone = $('#dropzone');
const importFeedback = $('#importFeedback');
const articleList = $('#articleList');
const emptyState = $('#emptyState');
const progressBar = $('#progressBar');
const progressLabel = $('#progressLabel');
const progressMessage = $('#progressMessage');
const statusCard = $('#statusCard');
const exportButton = $('#exportButton');
const scanButton = $('#scanButton');
const clearButton = $('#clearButton');
const backupButton = $('#backupButton');
const restoreButton = $('#restoreButton');
const restoreInput = $('#restoreInput');
const reportSection = $('#reportSection');
const reportGrid = $('#reportGrid');
const analysisDetailGrid = $('#analysisDetailGrid');
const analysisDetails = $('#analysisDetails');
const demoModeBanner = $('#demoModeBanner');
const themeToggle = $('#themeToggle');
const authorInput = $('#authorInput');
const corpusInput = $('#corpusInput');
const heroUploadButton = $('#heroUploadButton');
const emptyUploadButton = $('#emptyUploadButton');
const demoUploadButton = $('#demoUploadButton');
const onboardingEyebrow = $('#onboardingEyebrow');
const onboardingTitle = $('#onboardingTitle');
const onboardingDescription = $('#onboardingDescription');
const onboardingSteps = $('#onboardingSteps');
const onboardingSection = $('#onboardingSection');
const onboardingSkeleton = $('#onboardingSkeleton');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.querySelector('.theme-label').textContent = theme === 'dark' ? '浅色' : '深色';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
}

const onboardingContent = {
  welcome: { eyebrow: '准备好时开始', title: '上传文章', description: '我们会在本地整理它们。', primary: '导入文章', secondary: '查看示例' },
  drag: { eyebrow: '导入', title: '选择文章', description: '支持 Markdown、文本和 ZIP。', primary: '选择文件', secondary: '查看示例' },
  analyzing: { eyebrow: '处理中', title: '正在整理文章', description: '很快就好。', primary: '正在整理', secondary: '' },
  preview: { eyebrow: '已完成', title: '你的写作画像', description: '结果已准备好。', primary: '复制提示词', secondary: '添加文章' },
  dna: { eyebrow: '已完成', title: '你的写作画像', description: '结果已准备好。', primary: '复制提示词', secondary: '下载报告' },
  export: { eyebrow: '已复制', title: '提示词已准备好', description: '粘贴给 AI，继续工作。', primary: '导入更多', secondary: '下载报告' }
};

function setOnboardingStage(stage) {
  onboardingStage = stage;
  const content = onboardingContent[stage];
  onboardingEyebrow.textContent = content.eyebrow;
  onboardingTitle.textContent = content.title;
  onboardingDescription.textContent = content.description;
  scanButton.disabled = stage === 'analyzing';
  scanButton.innerHTML = `${content.primary}${stage === 'welcome' || stage === 'drag' ? ' <span>→</span>' : ''}`;
  exportButton.hidden = !content.secondary;
  onboardingSkeleton.hidden = stage !== 'analyzing';
  onboardingSection.setAttribute('aria-busy', String(stage === 'analyzing'));
  exportButton.textContent = content.secondary;
  if (onboardingSteps) [...onboardingSteps.querySelectorAll('li')].forEach((item, index) => {
    const itemStage = item.dataset.stage;
    const activeIndex = Object.keys(onboardingContent).indexOf(stage);
    item.classList.toggle('active', itemStage === stage);
    item.classList.toggle('complete', index < activeIndex);
    item.classList.toggle('processing', itemStage === 'analyzing' && stage === 'analyzing');
  });
}

function animateNumber(element, target) {
  const activeFrame = numberFrames.get(element);
  if (activeFrame) cancelAnimationFrame(activeFrame);
  const previous = Number(element.dataset.value || 0);
  const start = Number.isFinite(previous) ? previous : 0;
  const duration = Math.min(700, 260 + Math.abs(target - start) * 8);
  const began = performance.now();
  const update = now => {
    const progress = Math.min(1, (now - began) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    element.textContent = formatNumber(Math.round(start + (target - start) * eased));
    if (progress < 1) numberFrames.set(element, requestAnimationFrame(update));
    else { element.dataset.value = String(target); numberFrames.delete(element); }
  };
  numberFrames.set(element, requestAnimationFrame(update));
}

function playUploadSuccess() {
  clearTimeout(uploadSuccessTimer);
  dropzone.classList.remove('upload-success');
  void dropzone.offsetWidth;
  dropzone.classList.add('upload-success');
  uploadSuccessTimer = window.setTimeout(() => dropzone.classList.remove('upload-success'), 1150);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSavedWorkspace() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put({
        articles,
        author: authorInput.value,
        corpusName: corpusInput.value,
        savedAt: new Date().toISOString()
      }, 'current');
    } catch (error) {
      console.warn('Unable to save workspace locally.', error);
    }
  }, 250);
}

function formatNumber(number) { return new Intl.NumberFormat('zh-CN').format(number); }
function countCharacters(text) { return text.replace(/\s/g, '').length; }
function createId() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`; }
function titleFrom(content, fallback) {
  const line = content.split(/\r?\n/).map(line => line.trim()).find(line => line && !/^---$/.test(line));
  return (line || fallback).replace(/^#{1,6}\s*/, '').slice(0, 80);
}
function isArticleFile(name) { return /\.(md|txt)$/i.test(name); }
function contentKey(text) {
  const value = text.replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return `${value.length}:${hash >>> 0}`;
}

function articleFromText(name, text) {
  return {
    id: createId(), name, type: name.split('.').pop().toUpperCase(), text,
    title: titleFrom(text, name.replace(/\.(md|txt)$/i, '')), characters: countCharacters(text)
  };
}

function loadJsZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (jsZipPromise) return jsZipPromise;
  jsZipPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    script.async = true;
    script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error('ZIP reader unavailable'));
    script.onerror = () => reject(new Error('ZIP reader unavailable'));
    document.head.append(script);
  });
  return jsZipPromise;
}

function loadDemoArticles() {
  if (!demoArticlesPromise) {
    demoArticlesPromise = import('./demo-data.js').then(({ demoArticleSeeds }) => demoArticleSeeds.map(([title, text], index) => articleFromText(`示例文章-${index + 1}.md`, `# ${title}\n\n${text}`)));
  }
  return demoArticlesPromise;
}

async function unpackZip(file) {
  if (file.size > 50 * 1024 * 1024) throw new Error('ZIP is too large');
  const JSZip = await loadJsZip();
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(entry => !entry.dir && isArticleFile(entry.name));
  const results = await Promise.all(entries.map(async entry => articleFromText(entry.name, await entry.async('string'))));
  return results;
}

async function addFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  setOnboardingStage('analyzing');
  const directFiles = files.filter(file => isArticleFile(file.name));
  const zipFiles = files.filter(file => /\.zip$/i.test(file.name));
  const directArticles = await Promise.all(directFiles.map(async file => articleFromText(file.name, await file.text())));
  let packedArticles = [];
  try {
    packedArticles = (await Promise.all(zipFiles.map(unpackZip))).flat();
    if (zipFiles.length && !packedArticles.length) alert('ZIP 中没有可用文章。');
  } catch (error) {
    console.warn(error);
    alert('无法读取 ZIP。请检查文件。');
  }
  const existing = new Set(articles.map(article => contentKey(article.text)));
  const accepted = [];
  let duplicateCount = 0;
  [...directArticles, ...packedArticles].forEach(article => {
    const key = contentKey(article.text);
    if (existing.has(key)) duplicateCount += 1;
    else { existing.add(key); accepted.push(article); }
  });
  articles.push(...accepted);
  importFeedback.textContent = accepted.length ? `${accepted.length} 篇已加入${duplicateCount ? `。${duplicateCount} 篇重复，已跳过。` : '。'}` : '没有加入新文章。';
  if (articles.length) {
    isDemoMode = false;
    reportSection.hidden = true;
    reportMarkdown = '';
  }
  scheduleSave();
  render();
  if (!articles.length) {
    setOnboardingStage('welcome');
    return;
  }
  playUploadSuccess();
  await new Promise(resolve => window.setTimeout(resolve, 520));
  buildReport();
  setOnboardingStage('preview');
}

function render() {
  const count = articles.length;
  if (count && isDemoMode) {
    isDemoMode = false;
    reportSection.hidden = true;
    reportMarkdown = '';
  }
  const total = articles.reduce((sum, article) => sum + article.characters, 0);
  const ready = count >= requiredCount;
  animateNumber($('#articleCount'), count);
  animateNumber($('#wordCount'), total);
  animateNumber($('#averageCount'), count ? Math.round(total / count) : 0);
  progressLabel.textContent = `${count} / ${requiredCount} 篇`;
  progressBar.style.width = `${Math.min(100, (count / requiredCount) * 100)}%`;
  progressMessage.textContent = ready ? '文章已够。可以生成 DNA。' : `还差 ${requiredCount - count} 篇。继续导入。`;
  statusCard.classList.toggle('ready', ready);
  statusCard.innerHTML = `<span class="status-dot"></span><p><b>${ready ? '可以分析' : '继续导入'}</b><br />${ready ? '文章数量已足够。' : `还差 ${requiredCount - count} 篇。`}</p>`;
  clearButton.disabled = !count;
  backupButton.disabled = !count;
  emptyState.hidden = Boolean(count);
  articleList.innerHTML = articles.map((article, index) => `<li><span class="article-index">${String(index + 1).padStart(2, '0')}</span><span class="article-title" title="${escapeHtml(article.title)}">${escapeHtml(article.title)}</span><span class="article-meta">${formatNumber(article.characters)} 字 · ${article.type}</span><button class="remove-button" type="button" data-id="${article.id}" aria-label="移除 ${escapeHtml(article.title)}">×</button></li>`).join('');
}

function average(values) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function compactText(value, limit = 34) { const clean = value.replace(/\s+/g, ' ').trim(); return clean.length > limit ? `${clean.slice(0, limit)}…` : clean; }
function splitSentences(text) { return text.split(/[。！？!?]+/).map(item => item.trim()).filter(Boolean); }
function firstSentence(text) { return splitSentences(text)[0] || text.trim(); }
function lastSentence(text) { const list = splitSentences(text); return list[list.length - 1] || text.trim(); }
function countMatches(text, expression) { return (text.match(expression) || []).length; }
function topKeywords(text) {
  const stopwords = new Set(['我们', '你们', '他们', '这个', '那个', '一个', '一些', '可以', '没有', '自己', '因为', '所以', '如果', '但是', '以及', '还有', '已经', '不是', '就是', '进行', '什么', '怎么', '这样', '时候', '看到', '觉得', '可能', '需要', '通过', '对于', '其中', '文章', '内容', '写作']);
  const counts = new Map();
  const add = word => { if (word.length > 1 && !stopwords.has(word)) counts.set(word, (counts.get(word) || 0) + 1); };
  (text.match(/[\u4e00-\u9fff]{2,}/g) || []).forEach(chunk => {
    for (let index = 0; index < chunk.length - 1; index += 1) add(chunk.slice(index, index + 2));
  });
  (text.toLowerCase().match(/[a-z]{3,}/g) || []).forEach(add);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}
function barRows(items, suffix = '') {
  const maximum = Math.max(...items.map(([, value]) => value), 1);
  return items.map(([label, value]) => `<div class="bar-row"><span>${escapeHtml(label)}</span><i><b style="width:${Math.max(8, Math.round((value / maximum) * 100))}%"></b></i><strong>${value}${suffix}</strong></div>`).join('');
}
function sampleStrength(source) {
  if (source.length < 5) return { label: '初步观察', detail: '样本较少。结论可能变化。', tone: 'early' };
  if (source.length < requiredCount) return { label: '正在形成', detail: '再加入文章，可提高稳定性。', tone: 'forming' };
  return { label: '较稳定', detail: '样本数量已达到建议范围。', tone: 'ready' };
}
function buildReport(source = articles, demo = false, expanded = demo, shouldScroll = true) {
  const joined = source.map(article => article.text).join('\n');
  const paragraphLengths = joined.split(/\n\s*\n/).map(countCharacters).filter(Boolean);
  const sentenceTexts = splitSentences(joined);
  const sentences = sentenceTexts.map(countCharacters).filter(Boolean);
  const total = source.reduce((sum, article) => sum + article.characters, 0);
  const averageSentence = average(sentences);
  const averageParagraph = average(paragraphLengths);
  const punctuation = { question: countMatches(joined, /[？?]/g), exclamation: countMatches(joined, /[！!]/g), comma: countMatches(joined, /，/g) };
  const keywords = topKeywords(joined);
  const rhythm = [
    ['短句 15 字内', sentences.filter(value => value <= 15).length],
    ['中句 16-25 字', sentences.filter(value => value > 15 && value <= 25).length],
    ['长句 26-40 字', sentences.filter(value => value > 25 && value <= 40).length],
    ['长段句 40 字以上', sentences.filter(value => value > 40).length]
  ];
  const tone = [
    ['积极', countMatches(joined, /喜欢|希望|相信|成长|感谢|美好|值得|开心|热爱/g)],
    ['冷静', countMatches(joined, /分析|事实|判断|逻辑|方法|数据|问题|原因/g)],
    ['反思', countMatches(joined, /反思|困惑|遗憾|焦虑|害怕|失败|担心|不安/g)],
    ['互动', punctuation.question + punctuation.exclamation]
  ];
  const dominantTone = [...tone].sort((a, b) => b[1] - a[1])[0][0];
  const firstPerson = countMatches(joined, /我|我们/g);
  const readerAddress = countMatches(joined, /你|你们/g);
  const storyMarkers = countMatches(joined, /那天|那年|后来|当时|一次|故事|经历|记得/g);
  const narrative = [
    ['个人经验', firstPerson], ['读者对话', readerAddress], ['提问推进', punctuation.question], ['故事切入', storyMarkers]
  ];
  const dominantNarrative = [...narrative].sort((a, b) => b[1] - a[1])[0][0];
  const titleQuestions = source.filter(article => /[？?]/.test(article.title)).length;
  const headingCount = countMatches(joined, /^#{1,6}\s/gm);
  const difficulty = averageSentence <= 18 ? '易读' : averageSentence <= 30 ? '适中' : '信息密集';
  const difficultyNote = averageSentence <= 18 ? '短句更多。阅读更快。' : averageSentence <= 30 ? '句长平衡。阅读顺畅。' : '单句较长。信息更密。';
  const readiness = demo ? '这是示例。导入后会更新。' : source.length >= requiredCount ? '文章已够。可以深入分析。' : `已有 ${source.length} 篇。继续补充。`;
  const dnaSummary = `语气偏${dominantTone}。叙事偏${dominantNarrative}。句均 ${formatNumber(averageSentence)} 字。读感${difficulty}。`;
  const openingSamples = source.slice(0, 3).map(article => compactText(firstSentence(article.text), 42));
  const endingSamples = source.slice(-3).map(article => compactText(lastSentence(article.text), 42));
  const strength = demo ? { label: '示例结果', detail: '这是虚构文章的演示。', tone: 'early' } : sampleStrength(source);
  const sourceSamples = source.slice(0, 3).map(article => ({ title: article.title, excerpt: compactText(firstSentence(article.text), 72) }));
  aiPromptText = `请基于以下 Writing DNA 分析文章。\n\n画像：${dnaSummary}\n关键词：${keywords.map(([word]) => word).join('、') || '待补充'}\n节奏：句均 ${averageSentence} 字。\n叙事：${dominantNarrative}。\n语气：${dominantTone}。\n\n请输出：\n1. 语言规则\n2. 结构模板\n3. 保留表达\n4. 避免表达\n5. 三个写作提示词\n\n只依据这些文章。不要补造偏好。`;
  reportGrid.innerHTML = [
    UI.Card({ className: 'dna-summary-card', content: `<div><span class="card-label">Writing DNA</span><h3>${escapeHtml(demo ? '示例作者' : corpusInput.value.trim() || '这批文章')}的画像</h3><p>${escapeHtml(dnaSummary)}</p></div><div class="summary-readiness ${strength.tone}"><b>${strength.label}</b><span>${strength.detail}</span></div><details class="summary-evidence"><summary>查看样本片段</summary><ul>${sourceSamples.map(sample => `<li><b>${escapeHtml(sample.title)}</b><span>${escapeHtml(sample.excerpt)}</span></li>`).join('')}</ul></details>` }),
    UI.Metric({ label: '阅读难度', value: difficulty, description: difficultyNote }),
    UI.Metric({ label: '句子节奏', value: `${formatNumber(averageSentence)}<small> 字 / 句</small>`, description: `段均 ${formatNumber(averageParagraph)} 字。` }),
    UI.Metric({ label: '结构', value: headingCount ? '分层' : '连贯', description: headingCount ? `检测到 ${headingCount} 个标题。` : '以连续段落为主。' })
  ].join('');
  analysisDetailGrid.innerHTML = `
    <article class="analysis-card vocabulary-card"><div class="card-top"><div><span class="card-label">词汇</span><h3>常用词</h3></div><span class="card-caption">本地统计</span></div><div class="bar-list">${keywords.length ? barRows(keywords, ' 次') : '<p class="card-empty">文章太少。还没有词汇样本。</p>'}</div></article>
    <article class="analysis-card rhythm-card"><div class="card-top"><div><span class="card-label">节奏</span><h3>句子长度</h3></div><span class="card-caption">${formatNumber(averageSentence)} 字 / 句</span></div><div class="bar-list">${barRows(rhythm, ' 句')}</div></article>
    <article class="analysis-card"><div class="card-top"><div><span class="card-label">语气</span><h3>${dominantTone}表达</h3></div><span class="card-caption">本地统计</span></div><div class="bar-list">${barRows(tone, ' 次')}</div></article>
    <article class="analysis-card"><div class="card-top"><div><span class="card-label">叙事</span><h3>带领读者</h3></div><span class="card-caption">${dominantNarrative}</span></div><div class="bar-list">${barRows(narrative, ' 处')}</div></article>
    <article class="analysis-card sample-card"><span class="card-label">开头</span><h3>如何开始</h3><ol>${openingSamples.map(sample => `<li>${escapeHtml(sample || '还没有样本')}</li>`).join('')}</ol></article>
    <article class="analysis-card sample-card"><span class="card-label">结尾</span><h3>如何收束</h3><ol>${endingSamples.map(sample => `<li>${escapeHtml(sample || '还没有样本')}</li>`).join('')}</ol></article>
    <article class="analysis-card structure-card"><span class="card-label">结构</span><h3>文章路径</h3><div class="structure-flow"><span>标题</span><i></i><span>${titleQuestions ? '提问开场' : '直接开场'}</span><i></i><span>${headingCount ? '分段展开' : '连续展开'}</span><i></i><span>${punctuation.question ? '互动收束' : '观点收束'}</span></div><p>问句标题 ${titleQuestions} 篇。段均 ${formatNumber(averageParagraph)} 字。</p></article>
    <article class="analysis-card prompt-card"><div class="card-top"><div><span class="card-label">AI 提示词</span><h3>继续分析</h3></div><button class="text-button copy-prompt" id="copyPromptButton" type="button">复制提示词</button></div><pre>${escapeHtml(aiPromptText)}</pre></article>`;
  analysisDetails.open = expanded;
  demoModeBanner.hidden = !demo;
  reportSection.hidden = false;
  reportMarkdown = `# ${demo ? '示例 ' : ''}Writing DNA\n\n- 语料：${demo ? '示例文章' : corpusInput.value.trim() || '未命名'}\n- 作者：${demo ? '示例作者' : authorInput.value.trim() || '未填写'}\n- 时间：${new Date().toLocaleString('zh-CN')}\n- 强度：${strength.label}\n\n## 摘要\n\n${dnaSummary}\n\n${strength.detail}\n\n## 样本片段\n\n${sourceSamples.map(sample => `- ${sample.title}：${sample.excerpt}`).join('\n')}\n\n## 词汇\n\n${keywords.map(([word, count]) => `- ${word}：${count} 次`).join('\n') || '- 暂无样本'}\n\n## 节奏\n\n${rhythm.map(([name, count]) => `- ${name}：${count} 句`).join('\n')}\n\n## 语气\n\n${tone.map(([name, count]) => `- ${name}：${count} 处`).join('\n')}\n\n## 叙事\n\n${narrative.map(([name, count]) => `- ${name}：${count} 处`).join('\n')}\n\n## 开头\n\n${openingSamples.map(item => `- ${item}`).join('\n')}\n\n## 结尾\n\n${endingSamples.map(item => `- ${item}`).join('\n')}\n\n## AI 提示词\n\n${aiPromptText}\n\n> ${demo ? '这是示例结果。' : '结果来自本地模式统计。'}\n`;
  if (shouldScroll) reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showDemoReport(shouldScroll = false) {
  isDemoMode = true;
  const demoArticles = await loadDemoArticles();
  buildReport(demoArticles, true, true, shouldScroll);
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]); }
function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click(); URL.revokeObjectURL(url);
}
function downloadReport() { if (!reportMarkdown) buildReport(); download(reportMarkdown, 'text/markdown;charset=utf-8', 'writing-dna-pre-scan.md'); }
function downloadWorkspaceBackup() {
  const backup = {
    format: 'writing-dna-workspace', version: 1, exportedAt: new Date().toISOString(),
    author: authorInput.value, corpusName: corpusInput.value,
    articles: articles.map(({ name, text }) => ({ name, text }))
  };
  download(JSON.stringify(backup, null, 2), 'application/json;charset=utf-8', 'writing-dna-workspace.json');
}
function restoreWorkspace(file) {
  if (!file) return;
  file.text().then(text => {
    const backup = JSON.parse(text);
    if (backup?.format !== 'writing-dna-workspace' || backup.version !== 1 || !Array.isArray(backup.articles)) throw new Error('invalid backup');
    const restored = backup.articles
      .filter(article => typeof article?.name === 'string' && typeof article?.text === 'string' && article.text.trim())
      .map(article => articleFromText(article.name, article.text));
    if (!restored.length) throw new Error('empty backup');
    if (!window.confirm(`恢复 ${restored.length} 篇文章将替换当前工作台。是否继续？`)) return;
    articles.splice(0, articles.length, ...restored);
    authorInput.value = typeof backup.author === 'string' ? backup.author : '';
    corpusInput.value = typeof backup.corpusName === 'string' ? backup.corpusName : '';
    isDemoMode = false;
    importFeedback.textContent = `已恢复 ${restored.length} 篇文章。`;
    scheduleSave(); render(); buildReport(); setOnboardingStage('preview');
  }).catch(() => { importFeedback.textContent = '无法读取备份。请选择此工作台导出的 JSON 文件。'; });
}
async function copyAiPrompt(button, restoreLabel = true) {
  try {
    await navigator.clipboard.writeText(aiPromptText);
  } catch (error) {
    const fallback = document.createElement('textarea');
    fallback.value = aiPromptText;
    document.body.append(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
  }
  button.textContent = '已复制';
  if (restoreLabel) window.setTimeout(() => { button.textContent = '复制提示词'; }, 1600);
}

fileInput.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
heroUploadButton.addEventListener('click', () => { setOnboardingStage('drag'); fileInput.click(); });
emptyUploadButton.addEventListener('click', () => { setOnboardingStage('drag'); fileInput.click(); });
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); if (onboardingStage !== 'analyzing') setOnboardingStage('drag'); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
articleList.addEventListener('click', event => { const id = event.target.dataset.id; if (id) { articles.splice(articles.findIndex(article => article.id === id), 1); scheduleSave(); render(); } });
clearButton.addEventListener('click', () => { articles.length = 0; reportMarkdown = ''; reportSection.hidden = true; scheduleSave(); render(); setOnboardingStage('welcome'); });
backupButton.addEventListener('click', downloadWorkspaceBackup);
restoreButton.addEventListener('click', () => restoreInput.click());
restoreInput.addEventListener('change', event => { restoreWorkspace(event.target.files[0]); event.target.value = ''; });
scanButton.addEventListener('click', async () => {
  if (onboardingStage === 'welcome' || onboardingStage === 'drag') {
    setOnboardingStage('drag');
    fileInput.click();
  } else if (onboardingStage === 'preview') {
    await copyAiPrompt(scanButton, false);
    setOnboardingStage('export');
  } else if (onboardingStage === 'dna') {
    await copyAiPrompt(scanButton, false);
    setOnboardingStage('export');
  } else if (onboardingStage === 'export') {
    setOnboardingStage('drag');
    fileInput.click();
  }
});
exportButton.addEventListener('click', async () => {
  if (onboardingStage === 'welcome' || onboardingStage === 'drag') {
    await showDemoReport(true);
    setOnboardingStage('preview');
  } else if (onboardingStage === 'preview') {
    setOnboardingStage('drag');
    fileInput.click();
  } else {
    downloadReport();
  }
});
demoUploadButton.addEventListener('click', () => { setOnboardingStage('drag'); fileInput.click(); });
$('#downloadReportButton').addEventListener('click', downloadReport);
reportSection.addEventListener('click', event => {
  const button = event.target.closest('#copyPromptButton');
  if (button) copyAiPrompt(button);
});
themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('writing-dna-theme', nextTheme);
  setTheme(nextTheme);
});
[authorInput, corpusInput].forEach(input => input.addEventListener('input', scheduleSave));

async function start() {
  const savedTheme = localStorage.getItem('writing-dna-theme');
  setTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  try {
    const saved = await readSavedWorkspace();
    if (saved) {
      articles.push(...(saved.articles || []));
      authorInput.value = saved.author || '';
      corpusInput.value = saved.corpusName || '';
    }
  } catch (error) { console.warn('Unable to restore workspace locally.', error); }
  render();
  if (articles.length) buildReport(articles, false, false, false);
  setOnboardingStage(articles.length ? 'preview' : 'welcome');
}

start();
