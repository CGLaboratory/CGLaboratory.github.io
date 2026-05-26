const languageSwitcher = document.querySelector('[data-render="languages"]');
const contributeStatus = document.querySelector("#contribute-status");
const contributeContent = document.querySelector("#contribute-content");

let i18nData = null;
let currentLanguage = localStorage.getItem("cgl-language") || "en";

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
  document.title = language.contributePage.meta.title;

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

const loadContributionGuide = async () => {
  contributeStatus.textContent = getLanguage().contributePage.status.loading;
  contributeContent.innerHTML = "";

  try {
    const response = await fetch("content/contribute.md");
    if (!response.ok) {
      throw new Error("Unable to load contribution guide.");
    }
    const markdown = await response.text();
    contributeContent.innerHTML = parseMarkdown(markdown);
    contributeStatus.textContent = "";
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([contributeContent]).catch(() => {});
    }
  } catch (error) {
    contributeStatus.textContent = getLanguage().contributePage.status.error;
  }
};

const initialize = async () => {
  try {
    const response = await fetch("data/i18n.json");
    if (!response.ok) {
      throw new Error("Unable to load translations.");
    }
    i18nData = await response.json();
    renderChrome();
    await loadContributionGuide();
  } catch (error) {
    contributeStatus.textContent = "Contribution guide could not be loaded.";
  }
};

initialize();
