const requiredCount = 20;
const articles = [];
const databaseName = 'writing-dna-workbench';
const storeName = 'workspace';
let reportMarkdown = '';
let saveTimer;

const $ = (selector) => document.querySelector(selector);
const fileInput = $('#fileInput');
const dropzone = $('#dropzone');
const articleList = $('#articleList');
const emptyState = $('#emptyState');
const progressBar = $('#progressBar');
const progressLabel = $('#progressLabel');
const progressMessage = $('#progressMessage');
const statusCard = $('#statusCard');
const exportButton = $('#exportButton');
const scanButton = $('#scanButton');
const clearButton = $('#clearButton');
const reportSection = $('#reportSection');
const reportGrid = $('#reportGrid');
const themeToggle = $('#themeToggle');
const authorInput = $('#authorInput');
const corpusInput = $('#corpusInput');
const heroUploadButton = $('#heroUploadButton');
const emptyUploadButton = $('#emptyUploadButton');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  themeToggle.querySelector('.theme-label').textContent = theme === 'dark' ? '浅色' : '深色';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? '切换浅色模式' : '切换深色模式');
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

function articleFromText(name, text) {
  return {
    id: createId(), name, type: name.split('.').pop().toUpperCase(), text,
    title: titleFrom(text, name.replace(/\.(md|txt)$/i, '')), characters: countCharacters(text)
  };
}

async function unpackZip(file) {
  if (!window.JSZip) throw new Error('ZIP reader unavailable');
  if (file.size > 50 * 1024 * 1024) throw new Error('ZIP is too large');
  const zip = await window.JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(entry => !entry.dir && isArticleFile(entry.name));
  const results = await Promise.all(entries.map(async entry => articleFromText(entry.name, await entry.async('string'))));
  return results;
}

async function addFiles(fileList) {
  const files = [...fileList];
  const directFiles = files.filter(file => isArticleFile(file.name));
  const zipFiles = files.filter(file => /\.zip$/i.test(file.name));
  const directArticles = await Promise.all(directFiles.map(async file => articleFromText(file.name, await file.text())));
  try {
    const packedArticles = (await Promise.all(zipFiles.map(unpackZip))).flat();
    articles.push(...directArticles, ...packedArticles);
    if (zipFiles.length && !packedArticles.length) alert('ZIP 中没有找到 .md 或 .txt 文章。');
  } catch (error) {
    console.warn(error);
    articles.push(...directArticles);
    alert('有一个 ZIP 无法读取。请确认它未加密，并且其中包含 .md 或 .txt 文件。');
  }
  render();
}

function render() {
  const count = articles.length;
  const total = articles.reduce((sum, article) => sum + article.characters, 0);
  const ready = count >= requiredCount;
  $('#articleCount').textContent = count;
  $('#wordCount').textContent = formatNumber(total);
  $('#averageCount').textContent = count ? formatNumber(Math.round(total / count)) : '0';
  progressLabel.textContent = `${count} / ${requiredCount} 篇`;
  progressBar.style.width = `${Math.min(100, (count / requiredCount) * 100)}%`;
  progressMessage.textContent = ready ? '语料已满足建议数量。可以导出并开始写作 DNA 分析。' : `还差 ${requiredCount - count} 篇完整文章；建议内容来自同一作者或账号。`;
  statusCard.classList.toggle('ready', ready);
  statusCard.innerHTML = `<span class="status-dot"></span><p><b>${ready ? '可以开始分析' : '尚未就绪'}</b><br />${ready ? '已达到建议的 20 篇语料' : `还需导入 ${requiredCount - count} 篇完整文章`}</p>`;
  exportButton.disabled = !count;
  scanButton.disabled = !count;
  clearButton.disabled = !count;
  emptyState.hidden = Boolean(count);
  articleList.innerHTML = articles.map((article, index) => `<li><span class="article-index">${String(index + 1).padStart(2, '0')}</span><span class="article-title" title="${escapeHtml(article.title)}">${escapeHtml(article.title)}</span><span class="article-meta">${formatNumber(article.characters)} 字 · ${article.type}</span><button class="remove-button" type="button" data-id="${article.id}" aria-label="移除 ${escapeHtml(article.title)}">×</button></li>`).join('');
  scheduleSave();
}

function average(values) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function buildReport() {
  const joined = articles.map(article => article.text).join('\n');
  const paragraphLengths = joined.split(/\n\s*\n/).map(countCharacters).filter(Boolean);
  const sentences = joined.split(/[。！？!?]+/).map(countCharacters).filter(Boolean);
  const titles = articles.map(article => article.title);
  const punctuation = { '。': (joined.match(/。/g) || []).length, '，': (joined.match(/，/g) || []).length, '？': (joined.match(/[？?]/g) || []).length, '！': (joined.match(/[！!]/g) || []).length };
  const total = articles.reduce((sum, article) => sum + article.characters, 0);
  const report = [
    { title: '语料规模', body: `<strong>${articles.length}</strong> 篇文章\n共 ${formatNumber(total)} 字\n平均 ${formatNumber(average(articles.map(a => a.characters)))} 字 / 篇` },
    { title: '段落节奏', body: `共 ${formatNumber(paragraphLengths.length)} 个段落\n平均 ${formatNumber(average(paragraphLengths))} 字 / 段\n适合进一步观察长短段交替与转折位置。` },
    { title: '句子节奏', body: `约 ${formatNumber(sentences.length)} 句\n平均 ${formatNumber(average(sentences))} 字 / 句\n句号 ${formatNumber(punctuation['。'])} · 逗号 ${formatNumber(punctuation['，'])}` },
    { title: '标题样本', body: titles.slice(0, 4).map((title, index) => `${index + 1}. ${escapeHtml(title)}`).join('\n') || '尚无标题样本' },
    { title: '疑问与强调', body: `问号 ${formatNumber(punctuation['？'])} 次\n感叹号 ${formatNumber(punctuation['！'])} 次\n可用于判断叙述语气与互动倾向。` },
    { title: '下一步建议', body: articles.length >= requiredCount ? '语料数量已达建议门槛。导出分析包，交给 AI 提炼完整 DNA。' : `再补充 ${requiredCount - articles.length} 篇完整文章，可获得更可靠的风格画像。` }
  ];
  reportGrid.innerHTML = report.map(item => `<article class="report-card"><h3>${item.title}</h3><p>${item.body}</p></article>`).join('');
  reportSection.hidden = false;
  reportMarkdown = `# 写作 DNA · 语料预分析\n\n- 语料名称：${corpusInput.value.trim() || '未命名写作语料'}\n- 作者 / 账号：${authorInput.value.trim() || '未填写'}\n- 生成时间：${new Date().toLocaleString('zh-CN')}\n\n${report.map(item => `## ${item.title}\n\n${item.body.replace(/<[^>]+>/g, '')}`).join('\n\n')}\n\n> 本报告是浏览器内生成的基础统计与观察，不等同于完整写作 DNA。\n`;
  reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]); }
function download(content, type, name) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click(); URL.revokeObjectURL(url);
}
function downloadPackage() {
  download(JSON.stringify({
    schema: 'writing-dna-corpus/v1', exportedAt: new Date().toISOString(),
    corpusName: corpusInput.value.trim() || '未命名写作语料', author: authorInput.value.trim() || '未填写',
    instructions: '请使用 writing-dna-skill 分析本语料。语料少于 20 篇时，请将结果明确标记为演示性分析。',
    summary: { articleCount: articles.length, characterCount: articles.reduce((sum, article) => sum + article.characters, 0) },
    articles: articles.map(({ id, ...article }) => article)
  }, null, 2), 'application/json;charset=utf-8', 'writing-dna-corpus.json');
}
function downloadReport() { if (!reportMarkdown) buildReport(); download(reportMarkdown, 'text/markdown;charset=utf-8', 'writing-dna-pre-scan.md'); }

fileInput.addEventListener('change', event => { addFiles(event.target.files); event.target.value = ''; });
heroUploadButton.addEventListener('click', () => fileInput.click());
emptyUploadButton.addEventListener('click', () => fileInput.click());
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => addFiles(event.dataTransfer.files));
articleList.addEventListener('click', event => { const id = event.target.dataset.id; if (id) { articles.splice(articles.findIndex(article => article.id === id), 1); render(); } });
clearButton.addEventListener('click', () => { articles.length = 0; reportMarkdown = ''; reportSection.hidden = true; render(); });
exportButton.addEventListener('click', downloadPackage);
scanButton.addEventListener('click', buildReport);
$('#downloadReportButton').addEventListener('click', downloadReport);
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
}

start();
