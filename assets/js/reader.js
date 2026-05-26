const languageSwitcher = document.querySelector('[data-render="languages"]');
const chapterList = document.querySelector('[data-render="chapter-list"]');
const readerMeta = document.querySelector('[data-render="reader-meta"]');
const readerStatus = document.querySelector("#reader-status");
const readerContent = document.querySelector("#reader-content");

let i18nData = null;
let library = null;
let currentLanguage = localStorage.getItem("cgl-language") || "en";
let activeSeries = null;
let activeChapter = null;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const inlineMarkdown = (value) => {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return text;
};

const getPathValue = (source, path) =>
  path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);

const getLanguage = () => {
  if (i18nData.languages[currentLanguage]) {
    return i18nData.languages[currentLanguage];
  }
  currentLanguage = i18nData.defaultLanguage;
  return i18nData.languages[currentLanguage];
};

const applyStaticTranslations = (language) => {
  document.documentElement.lang = language.htmlLang || currentLanguage;
  document.title = activeChapter
    ? `${activeChapter.title} · Computer Graphics Laboratory`
    : language.reader.meta.title;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getPathValue(language, element.dataset.i18n);
    if (value !== undefined) {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    element.dataset.i18nAttr.split(";").forEach((rule) => {
      const [attribute, path] = rule.split(":");
      const value = getPathValue(language, path);
      if (attribute && value !== undefined) {
        element.setAttribute(attribute, value);
      }
    });
  });
};

const renderLanguageButtons = () => {
  const languageCodes = i18nData.languageOrder || Object.keys(i18nData.languages);
  languageSwitcher.innerHTML = languageCodes
    .map((code) => {
      const option = i18nData.languages[code];
      const isActive = code === currentLanguage;
      return `
        <button class="language-option${isActive ? " active" : ""}" type="button" data-lang="${escapeHtml(code)}" aria-pressed="${String(isActive)}">
          ${escapeHtml(option.label || code)}
        </button>
      `;
    })
    .join("");

  languageSwitcher.querySelectorAll(".language-option").forEach((button) => {
    button.addEventListener("click", () => {
      currentLanguage = button.dataset.lang;
      localStorage.setItem("cgl-language", currentLanguage);
      renderChrome();
    });
  });
};

const parseTable = (lines, start) => {
  const header = lines[start];
  const separator = lines[start + 1];
  const separatorPattern = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

  if (!separator || !separatorPattern.test(separator)) {
    return null;
  }

  const rows = [];
  let index = start;
  while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
    rows.push(lines[index]);
    index += 1;
  }

  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => inlineMarkdown(cell.trim()));

  const headerCells = cells(header).map((cell) => `<th>${cell}</th>`).join("");
  const bodyRows = rows
    .slice(2)
    .map((row) => `<tr>${cells(row).map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");

  return {
    html: `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
    next: index
  };
};

const parseMarkdown = (markdown) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list) {
      html.push(`<${list.type}>${list.items.join("")}</${list.type}>`);
      list = null;
    }
  };

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      flushList();
      const lang = trimmed.replace(/^```/, "").trim();
      index += 1;
      const code = [];
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      html.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      flushParagraph();
      flushList();
      html.push(table.html);
      index = table.next;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      flushList();
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map((item) => `<p>${inlineMarkdown(item)}</p>`).join("")}</blockquote>`);
      continue;
    }

    const unordered = /^[-*]\s+(.*)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? "ul" : "ol";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
      index += 1;
      continue;
    }

    paragraph.push(trimmed);
    index += 1;
  }

  flushParagraph();
  flushList();
  return html.join("\n");
};

const renderChrome = () => {
  const language = getLanguage();
  applyStaticTranslations(language);
  renderLanguageButtons();
};

const renderSidebar = () => {
  readerMeta.innerHTML = `
    <p class="eyebrow">${escapeHtml(getLanguage().articles.groups.series)}</p>
    <h2>${escapeHtml(activeSeries.title)}</h2>
    <p>${escapeHtml(activeSeries.summary)}</p>
  `;

  chapterList.innerHTML = activeSeries.chapters
    .map(
      (chapter) => `
        <a class="chapter-card${chapter.id === activeChapter.id ? " active" : ""}" href="reader.html?series=${encodeURIComponent(activeSeries.id)}&chapter=${encodeURIComponent(chapter.id)}">
          <span>${escapeHtml(chapter.title)}</span>
          <small>${escapeHtml(chapter.summary)}</small>
        </a>
      `
    )
    .join("");
};

const loadChapter = async () => {
  readerStatus.textContent = getLanguage().reader.status.loading;
  readerContent.innerHTML = "";

  try {
    const response = await fetch(activeChapter.path);
    if (!response.ok) {
      throw new Error(`Unable to load ${activeChapter.path}`);
    }
    const markdown = await response.text();
    readerContent.innerHTML = parseMarkdown(markdown);
    readerStatus.textContent = "";
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([readerContent]).catch(() => {});
    }
  } catch (error) {
    readerStatus.textContent = getLanguage().reader.status.error;
  }
};

const initialize = async () => {
  try {
    const [i18nResponse, libraryResponse] = await Promise.all([
      fetch("data/i18n.json"),
      fetch("data/library.json")
    ]);
    if (!i18nResponse.ok || !libraryResponse.ok) {
      throw new Error("Unable to load reader data.");
    }
    i18nData = await i18nResponse.json();
    library = await libraryResponse.json();

    const params = new URLSearchParams(window.location.search);
    const seriesId = params.get("series") || library.series[0]?.id;
    activeSeries = library.series.find((series) => series.id === seriesId);
    if (!activeSeries || !activeSeries.chapters.length) {
      throw new Error("Series not found or has no chapters.");
    }

    const chapterId = params.get("chapter") || activeSeries.chapters[0].id;
    activeChapter = activeSeries.chapters.find((chapter) => chapter.id === chapterId) || activeSeries.chapters[0];

    renderChrome();
    renderSidebar();
    await loadChapter();
  } catch (error) {
    readerStatus.textContent = "Article could not be loaded.";
  }
};

initialize();
