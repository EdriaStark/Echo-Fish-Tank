(() => {
  const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
  const classNames = (...names) => names.filter(Boolean).join(' ');
  const button = (variant, { id = '', label, className = '', disabled = false, attributes = '' }) => `<button${id ? ` id="${id}"` : ''} class="${classNames(`${variant}-button`, 'ui-button', className)}" type="button"${disabled ? ' disabled' : ''} ${attributes}>${label}</button>`;

  const PrimaryButton = options => button('primary', options);
  const SecondaryButton = options => button('secondary', options);
  const Card = ({ className = '', content, attributes = '' }) => `<article class="${classNames('ui-card', className)}" ${attributes}>${content}</article>`;
  const Section = ({ className = '', id = '', label = '', content }) => `<section${id ? ` id="${id}"` : ''} class="${classNames('ui-section', className)}"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${content}</section>`;
  const UploadArea = () => `
    <div class="hero-upload ui-card" aria-label="导入文章">
      <div class="upload-heading"><span class="upload-kicker">文章库</span><strong>导入文章</strong><small>支持 Markdown、文本和 ZIP</small></div>
      <label class="dropzone hero-dropzone" id="dropzone" for="fileInput">
        <input id="fileInput" type="file" accept=".md,.txt,.zip,text/markdown,text/plain,application/zip,application/x-zip-compressed" multiple />
        <span class="upload-icon">↑</span><strong>拖入文章或 ZIP</strong><small>也可点击选择</small>
      </label>
      <div class="upload-note"><span>本地保存</span><span>建议 20 篇</span></div>
      <p class="upload-feedback" id="importFeedback" aria-live="polite"></p>
    </div>`;
  const StatsCard = () => `
    <aside class="insight-panel ui-card">
      <p class="eyebrow">语料</p>
      <div class="stat"><strong id="articleCount">0</strong><span>篇文章</span></div>
      <div class="stat"><strong id="wordCount">0</strong><span>总字数</span></div>
      <div class="stat"><strong id="averageCount">0</strong><span>平均字数</span></div>
      <div class="status-card" id="statusCard"><span class="status-dot"></span><p><b>继续导入</b><br />还差 20 篇。</p></div>
    </aside>`;
  const ProgressCard = () => `
    <section class="progress-section ui-card" aria-label="语料进度">
      <div class="progress-head"><span>语料进度</span><strong id="progressLabel">0 / 20 篇</strong></div>
      <div class="meter" aria-hidden="true"><span id="progressBar"></span></div>
      <p id="progressMessage">从一篇开始。</p>
    </section>`;
  const Metric = ({ label, value, description, className = '' }) => Card({ className: classNames('report-card', 'metric-card', className), content: `<span class="card-label">${escapeHtml(label)}</span><strong>${value}</strong><p>${escapeHtml(description)}</p>` });
  const Header = () => `
    <header class="topbar">
      <a class="brand" href="#top" aria-label="WriDNA 首页"><span class="brand-mark">✦</span><span class="brand-name">WriDNA</span><span class="brand-divider">/</span><span class="brand-page">工作台</span></a>
      <div class="topbar-actions"><span class="beta-badge"><b>Private Beta</b><span>Invite Only</span></span><p class="local-note"><i></i><span>本地保存</span></p><button class="theme-toggle" id="themeToggle" type="button" aria-label="切换深色模式" aria-pressed="false"><span aria-hidden="true">◐</span><span class="theme-label">深色</span></button></div>
    </header>`;
  const Footer = () => '<footer><span>WriDNA Private Beta</span><span>你的写作只留在本地浏览器。</span></footer>';

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
