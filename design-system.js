(() => {
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const classNames = (...names) => names.filter(Boolean).join(' ');
  const button = (variant, { id = '', label, className = '', disabled = false, attributes = '' }) => `<button${id ? ` id="${id}"` : ''} class="${classNames(`${variant}-button`, 'ui-button', className)}" type="button"${disabled ? ' disabled' : ''} ${attributes}>${label}</button>`;

  const PrimaryButton = options => button('primary', options);
  const SecondaryButton = options => button('secondary', options);
  const Card = ({ className = '', content, attributes = '' }) => `<article class="${classNames('ui-card', className)}" ${attributes}>${content}</article>`;
  const Section = ({ className = '', id = '', label = '', content }) => `<section${id ? ` id="${id}"` : ''} class="${classNames('ui-section', className)}"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${content}</section>`;
  const UploadArea = () => `
    <div class="hero-upload ui-card" aria-label="文章导入区">
      <div class="upload-heading"><span class="upload-kicker">开始语料库</span><strong>导入文章</strong><small>支持多个 Markdown、文本文件或一个 ZIP</small></div>
      <label class="dropzone hero-dropzone" id="dropzone" for="fileInput">
        <input id="fileInput" type="file" accept=".md,.txt,.zip,text/markdown,text/plain,application/zip,application/x-zip-compressed" multiple />
        <span class="upload-icon">↑</span><strong>拖入文章或 ZIP</strong><small>也可以点击选择文件</small>
      </label>
      <div class="upload-note"><span>本地保存</span><span>推荐 20 篇完整文章</span></div>
    </div>`;
  const StatsCard = () => `
    <aside class="insight-panel ui-card">
      <p class="eyebrow">语料概览</p>
      <div class="stat"><strong id="articleCount">0</strong><span>篇文章</span></div>
      <div class="stat"><strong id="wordCount">0</strong><span>总字数</span></div>
      <div class="stat"><strong id="averageCount">0</strong><span>平均字数</span></div>
      <div class="status-card" id="statusCard"><span class="status-dot"></span><p><b>尚未就绪</b><br />还需导入 20 篇完整文章</p></div>
    </aside>`;
  const ProgressCard = () => `
    <section class="progress-section ui-card" aria-label="工作进度">
      <div class="progress-head"><span>语料准备度</span><strong id="progressLabel">0 / 20 篇</strong></div>
      <div class="meter" aria-hidden="true"><span id="progressBar"></span></div>
      <p id="progressMessage">从第一篇完整文章开始。建议使用同一作者或账号的内容。</p>
    </section>`;
  const Metric = ({ label, value, description, className = '' }) => Card({ className: classNames('report-card', 'metric-card', className), content: `<span class="card-label">${escapeHtml(label)}</span><strong>${value}</strong><p>${escapeHtml(description)}</p>` });
  const Header = () => `
    <header class="topbar">
      <a class="brand" href="#top" aria-label="写作 DNA 工作台首页"><span class="brand-mark">✦</span><span class="brand-name">写作 DNA</span><span class="brand-divider">/</span><span class="brand-page">语料工作台</span></a>
      <div class="topbar-actions"><p class="local-note"><i></i><span>本地保存</span></p><button class="theme-toggle" id="themeToggle" type="button" aria-label="切换深色模式" aria-pressed="false"><span aria-hidden="true">◐</span><span class="theme-label">深色</span></button></div>
    </header>`;
  const Footer = () => '<footer>WRITE WITH INTENTION · MADE FOR YOUR WORDS</footer>';

  const components = Object.freeze({ PrimaryButton, SecondaryButton, Card, Section, UploadArea, StatsCard, ProgressCard, Metric, Header, Footer });
  window.WritingDNAComponents = components;
  const mounts = {
    headerMount: Header(), footerMount: Footer(), uploadAreaMount: UploadArea(), progressCardMount: ProgressCard(), statsCardMount: StatsCard()
  };
  Object.entries(mounts).forEach(([id, markup]) => {
    const mount = document.getElementById(id);
    if (mount) mount.innerHTML = markup;
  });
})();
