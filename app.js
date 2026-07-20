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
  welcome: { eyebrow: '开始使用', title: '欢迎来到你的写作 DNA 工作台', description: '先导入几篇完整文章。系统会在浏览器中整理语料，并带你走完从预览到 AI 提示词的过程。', primary: '导入文章', secondary: '查看示例报告' },
  drag: { eyebrow: '导入语料', title: '拖入你的文章', description: '支持 Markdown、文本文件或 ZIP。内容只在当前浏览器中处理与保存。', primary: '选择文件', secondary: '查看示例报告' },
  analyzing: { eyebrow: '正在分析', title: '正在整理这批文章', description: '正在读取篇幅、段落、句子节奏和词汇线索。很快就能看到第一版画像。', primary: '正在分析', secondary: '' },
  preview: { eyebrow: '结果预览', title: '先确认你的写作画像', description: '先看摘要与关键判断。确认方向后，再展开完整语言画像并生成可复用的 Writing DNA。', primary: '生成 Writing DNA', secondary: '添加文章' },
  dna: { eyebrow: 'Writing DNA', title: '你的写作 DNA 已准备好', description: '完整画像已展开。下一步将分析要点整理成可直接交给 AI 的提示词。', primary: '复制 AI 提示词', secondary: '下载分析报告' },
  export: { eyebrow: '已准备好', title: '提示词已复制', description: '把它粘贴到支持 Writing DNA 的 AI 对话中，即可继续生成风格指南与写作模板。', primary: '导入更多文章', secondary: '下载分析报告' }
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
  [...onboardingSteps.querySelectorAll('li')].forEach((item, index) => {
    const itemStage = item.dataset.stage;
    const activeIndex = Object.keys(onboardingContent).indexOf(stage);
    item.classList.toggle('active', itemStage === stage);
    item.classList.toggle('complete', index < activeIndex);
    item.classList.toggle('processing', itemStage === 'analyzing' && stage === 'analyzing');
  });
}

function animateNumber(element, target) {
  const previous = Number(element.dataset.value || 0);
  const start = Number.isFinite(previous) ? previous : 0;
  const duration = Math.min(700, 260 + Math.abs(target - start) * 8);
  const began = performance.now();
  const update = now => {
    const progress = Math.min(1, (now - began) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    element.textContent = formatNumber(Math.round(start + (target - start) * eased));
    if (progress < 1) requestAnimationFrame(update);
    else element.dataset.value = String(target);
  };
  requestAnimationFrame(update);
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

function articleFromText(name, text) {
  return {
    id: createId(), name, type: name.split('.').pop().toUpperCase(), text,
    title: titleFrom(text, name.replace(/\.(md|txt)$/i, '')), characters: countCharacters(text)
  };
}

const demoArticles = [
  ['把复杂问题讲清楚，需要先承认不确定', '很多复杂问题并不缺答案，缺的是一个让人愿意继续思考的起点。今天想从一个工作里的小困惑讲起。我们总希望快速得出结论，但真正有用的方法，往往是先把问题说完整。\n\n当你愿意承认不确定，讨论才会从立场回到事实。接下来可以拆开假设，找到最小的行动。\n\n写作也是如此。先让读者看见问题，再陪他抵达一个暂时可信的答案。'],
  ['为什么好的表达总是留一点余地', '上周和朋友聊天时，他问我怎样写出更有说服力的文章。我没有立刻回答，因为说服不是把声音放大。\n\n好的表达会给事实留位置，也给读者留一点判断空间。你不需要替所有人完成思考。\n\n如果一篇文章能让人愿意把自己的经验带进来，它就已经开始发生作用。'],
  ['先把事情做小，才有机会持续', '我们常常把开始想得太重，于是迟迟没有开始。一个项目、一篇文章，甚至一次对话，都可以先从更小的动作进入。\n\n小不是敷衍，而是给反馈留下空间。你可以先写三百字，先问一个问题，先完成一次可见的尝试。\n\n持续不是意志力的胜利，它来自一个足够轻的开始。'],
  ['那些看似无效的记录，后来都帮了忙', '我曾经保存过很多没有结论的笔记。它们零散、重复，有时甚至显得毫无价值。\n\n后来回头看才发现，重复出现的问题就是线索。记录不会立刻给出答案，却会慢慢形成判断的材料。\n\n所以别急着评价一段记录是否有用。先留下来，时间会帮你看见它的意义。'],
  ['做决定前，先分清事实和感受', '当事情变得紧急，我们很容易把感受当成事实。焦虑会说现在就要行动，但它不一定告诉你行动的方向。\n\n一个简单的方法是写下两列：已经知道的事实，以及仍然需要验证的假设。这样做不是为了变冷静，而是为了让下一步更准确。\n\n有些决定不需要更快，它们需要更清楚。'],
  ['写给正在寻找方法的人', '如果你也在寻找一种更稳定的工作方式，不妨从观察自己开始。你在哪些时刻写得最顺，哪些问题总会反复出现？\n\n方法不是从外面拿来的模板，而是从一次次具体尝试里长出来的。把经验留下，把变化说清。\n\n愿你下一次开始时，已经比上一次更了解自己。']
].map(([title, text], index) => articleFromText(`示例文章-${index + 1}.md`, `# ${title}\n\n${text}`));

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
  if (!files.length) return;
  setOnboardingStage('analyzing');
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
  if (articles.length) {
    isDemoMode = false;
    reportSection.hidden = true;
    reportMarkdown = '';
  }
  render();
  if (!articles.length) {
    showDemoReport(true);
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
  progressMessage.textContent = ready ? '语料已满足建议数量。可以导出并开始写作 DNA 分析。' : `还差 ${requiredCount - count} 篇完整文章；建议内容来自同一作者或账号。`;
  statusCard.classList.toggle('ready', ready);
  statusCard.innerHTML = `<span class="status-dot"></span><p><b>${ready ? '可以开始分析' : '尚未就绪'}</b><br />${ready ? '已达到建议的 20 篇语料' : `还需导入 ${requiredCount - count} 篇完整文章`}</p>`;
  clearButton.disabled = !count;
  emptyState.hidden = Boolean(count);
  articleList.innerHTML = articles.map((article, index) => `<li><span class="article-index">${String(index + 1).padStart(2, '0')}</span><span class="article-title" title="${escapeHtml(article.title)}">${escapeHtml(article.title)}</span><span class="article-meta">${formatNumber(article.characters)} 字 · ${article.type}</span><button class="remove-button" type="button" data-id="${article.id}" aria-label="移除 ${escapeHtml(article.title)}">×</button></li>`).join('');
  scheduleSave();
}

function average(values) { return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function compactText(value, limit = 34) { const clean = value.replace(/\s+/g, ' ').trim(); return clean.length > limit ? `${clean.slice(0, limit)}…` : clean; }
function splitSentences(text) { return text.split(/[。！？!?]+/).map(item => item.trim()).filter(Boolean); }
function firstSentence(text) { return splitSentences(text)[0] || text.trim(); }
function lastSentence(text) { const list = splitSentences(text); return list[list.length - 1] || text.trim(); }
function countMatches(text, expression) { return (text.match(expression) || []).length; }
function percentage(part, total) { return total ? Math.round((part / total) * 100) : 0; }
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
  const difficultyNote = averageSentence <= 18 ? '短句占比较高，阅读推进较快。' : averageSentence <= 30 ? '句长与信息量保持平衡。' : '单句承载信息较多，适合加入短句换气。';
  const readiness = demo ? '这是一份示例结果。上传你的文章后，所有结论会替换为仅属于你的本地统计。' : source.length >= requiredCount ? '语料规模已达到建议门槛，可以进入深入蒸馏。' : `目前有 ${source.length} 篇文章，继续补充到 20 篇后，风格判断会更稳定。`;
  const dnaSummary = `这组文章呈现出以${dominantTone}语气为主、用${dominantNarrative}推进的表达倾向。平均每段 ${formatNumber(averageParagraph)} 字，每句 ${formatNumber(averageSentence)} 字，整体读感为${difficulty}。`;
  const openingSamples = articles.slice(0, 3).map(article => compactText(firstSentence(article.text), 42));
  const endingSamples = articles.slice(-3).map(article => compactText(lastSentence(article.text), 42));
  aiPromptText = `请基于以下 Writing DNA 继续分析并输出可执行的写作指南。\n\n写作画像：${dnaSummary}\n高频关键词：${keywords.map(([word]) => word).join('、') || '待补充'}\n句子节奏：平均 ${averageSentence} 字 / 句，${rhythm.map(([name, value]) => `${name} ${value} 句`).join('；')}\n叙事方式：${dominantNarrative}\n常见语气：${dominantTone}\n\n请输出：\n1. 语言与词汇规则\n2. 标题、开头、正文、结尾的结构模板\n3. 需要保留与避免的表达方式\n4. 3 个可直接套用的写作提示词\n\n重要：所有结论都应引用或归纳这批文章中的真实模式，不能补造作者偏好。`;
  reportGrid.innerHTML = `
    <article class="dna-summary-card">
      <div><span class="card-label">Writing DNA 摘要</span><h3>${escapeHtml(demo ? '示例作者' : corpusInput.value.trim() || '这批写作语料')}的表达画像</h3><p>${escapeHtml(dnaSummary)}</p></div>
      <div class="summary-readiness"><b>${demo ? '示例报告' : source.length >= requiredCount ? '可以深入分析' : '持续收集语料'}</b><span>${escapeHtml(readiness)}</span></div>
    </article>
    <article class="report-card metric-card"><span class="card-label">阅读难度</span><strong>${difficulty}</strong><p>${difficultyNote}</p></article>
    <article class="report-card metric-card"><span class="card-label">核心节奏</span><strong>${formatNumber(averageSentence)}<small> 字 / 句</small></strong><p>平均 ${formatNumber(averageParagraph)} 字 / 段，共 ${formatNumber(sentences.length)} 句。</p></article>
    <article class="report-card metric-card"><span class="card-label">写作结构</span><strong>${headingCount ? '分层' : '连贯'}</strong><p>${headingCount ? `检测到 ${headingCount} 个 Markdown 标题。` : '以连续段落为主，标题层级较少。'}</p></article>`;
  analysisDetailGrid.innerHTML = `
    <article class="analysis-card vocabulary-card"><div class="card-top"><div><span class="card-label">词汇画像</span><h3>高频关键词</h3></div><span class="card-caption">本地统计</span></div><div class="bar-list">${keywords.length ? barRows(keywords, ' 次') : '<p class="card-empty">文章篇幅不足，尚未形成关键词样本。</p>'}</div></article>
    <article class="analysis-card rhythm-card"><div class="card-top"><div><span class="card-label">句子节奏</span><h3>长短句分布</h3></div><span class="card-caption">${formatNumber(averageSentence)} 字 / 句</span></div><div class="bar-list">${barRows(rhythm, ' 句')}</div></article>
    <article class="analysis-card"><div class="card-top"><div><span class="card-label">情绪语气</span><h3>${dominantTone}的表达倾向</h3></div><span class="card-caption">线索统计</span></div><div class="bar-list">${barRows(tone, ' 次')}</div></article>
    <article class="analysis-card"><div class="card-top"><div><span class="card-label">叙事方式</span><h3>如何带领读者</h3></div><span class="card-caption">${dominantNarrative}</span></div><div class="bar-list">${barRows(narrative, ' 处')}</div></article>
    <article class="analysis-card sample-card"><span class="card-label">常见开头</span><h3>前三句话如何进入主题</h3><ol>${openingSamples.map(sample => `<li>${escapeHtml(sample || '尚无开头样本')}</li>`).join('')}</ol></article>
    <article class="analysis-card sample-card"><span class="card-label">常见结尾</span><h3>文章如何收束</h3><ol>${endingSamples.map(sample => `<li>${escapeHtml(sample || '尚无结尾样本')}</li>`).join('')}</ol></article>
    <article class="analysis-card structure-card"><span class="card-label">结构模式</span><h3>文章的组织方式</h3><div class="structure-flow"><span>标题</span><i></i><span>${titleQuestions ? '问题切入' : '直接开场'}</span><i></i><span>${headingCount ? '分段展开' : '连续展开'}</span><i></i><span>${punctuation.question ? '互动收束' : '观点收束'}</span></div><p>标题问句 ${titleQuestions} 篇。段落平均 ${formatNumber(averageParagraph)} 字，可作为后续结构模板的参考。</p></article>
    <article class="analysis-card prompt-card"><div class="card-top"><div><span class="card-label">AI-ready prompt</span><h3>带着这份画像继续分析</h3></div><button class="text-button copy-prompt" id="copyPromptButton" type="button">复制提示词</button></div><pre>${escapeHtml(aiPromptText)}</pre></article>`;
  analysisDetails.open = expanded;
  demoModeBanner.hidden = !demo;
  reportSection.hidden = false;
  reportMarkdown = `# ${demo ? '示例' : ''}Writing DNA 分析结果\n\n- 语料名称：${demo ? '示例作者文章集' : corpusInput.value.trim() || '未命名写作语料'}\n- 作者 / 账号：${demo ? '虚构示例作者' : authorInput.value.trim() || '未填写'}\n- 生成时间：${new Date().toLocaleString('zh-CN')}\n\n## Writing DNA 摘要\n\n${dnaSummary}\n\n${readiness}\n\n## 词汇画像\n\n${keywords.map(([word, count]) => `- ${word}：${count} 次`).join('\n') || '- 尚未形成关键词样本'}\n\n## 句子节奏\n\n${rhythm.map(([name, count]) => `- ${name}：${count} 句`).join('\n')}\n\n## 情绪语气\n\n${tone.map(([name, count]) => `- ${name}：${count} 处`).join('\n')}\n\n## 叙事方式\n\n${narrative.map(([name, count]) => `- ${name}：${count} 处`).join('\n')}\n\n## 常见开头\n\n${openingSamples.map(item => `- ${item}`).join('\n')}\n\n## 常见结尾\n\n${endingSamples.map(item => `- ${item}`).join('\n')}\n\n## AI-ready prompt\n\n${aiPromptText}\n\n> ${demo ? '这是虚构语料生成的示例报告。' : '这是一份浏览器本地统计结果，用于发现线索。完整的风格判断仍需结合全文与选题语境。'}\n`;
  if (shouldScroll) reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showDemoReport(shouldScroll = false) {
  isDemoMode = true;
  buildReport(demoArticles, true, true, shouldScroll);
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
articleList.addEventListener('click', event => { const id = event.target.dataset.id; if (id) { articles.splice(articles.findIndex(article => article.id === id), 1); render(); } });
clearButton.addEventListener('click', () => { articles.length = 0; reportMarkdown = ''; render(); showDemoReport(); setOnboardingStage('welcome'); });
scanButton.addEventListener('click', async () => {
  if (onboardingStage === 'welcome' || onboardingStage === 'drag') {
    setOnboardingStage('drag');
    fileInput.click();
  } else if (onboardingStage === 'preview') {
    buildReport(articles, false, true);
    setOnboardingStage('dna');
  } else if (onboardingStage === 'dna') {
    await copyAiPrompt(scanButton, false);
    setOnboardingStage('export');
  } else if (onboardingStage === 'export') {
    setOnboardingStage('drag');
    fileInput.click();
  }
});
exportButton.addEventListener('click', () => {
  if (onboardingStage === 'welcome' || onboardingStage === 'drag') {
    showDemoReport(true);
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
  if (!articles.length) showDemoReport();
  setOnboardingStage(articles.length ? 'preview' : 'welcome');
}

start();
