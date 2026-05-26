const bookShelf = document.querySelector('[data-render="book-shelf"]');
const volumeCount = document.querySelector('[data-render="volume-count"]');
const volumeDetail = document.querySelector('[data-render="volume-detail"]');
const chapterList = document.querySelector('[data-render="chapter-list"]');
const languageSwitcher = document.querySelector('[data-render="languages"]');

let library = null;
let i18nData = null;
let currentLanguage = localStorage.getItem("cgl-language") || "en";
let activeItemId = null;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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
  document.title = language.articles.meta.title;

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
      renderPage();
    });
  });
};

const getItems = () => [
  ...library.series.map((item) => ({ ...item, group: getLanguage().articles.groups.series })),
  ...library.papers.map((item) => ({ ...item, group: getLanguage().articles.groups.paper }))
];

const renderBookshelf = () => {
  const items = getItems();
  if (!activeItemId) {
    activeItemId = items[0]?.id || null;
  }
  volumeCount.textContent = String(items.length).padStart(2, "0");

  bookShelf.innerHTML = items
    .map(
      (item, index) => `
        <button
          class="book-volume ${escapeHtml(item.color || "blue")}${item.id === activeItemId ? " active" : ""}"
          type="button"
          data-item-id="${escapeHtml(item.id)}"
          style="--book-height: ${260 + (index % 3) * 24}px"
          aria-label="${escapeHtml(item.title)}"
        >
          <span class="book-band">${escapeHtml(item.group)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.status)}</small>
        </button>
      `
    )
    .join("");

  bookShelf.querySelectorAll(".book-volume").forEach((button) => {
    button.addEventListener("click", () => {
      activeItemId = button.dataset.itemId;
      renderCurrentItem();
    });
  });
};

const renderCurrentItem = () => {
  renderBookshelf();
  const item = getItems().find((entry) => entry.id === activeItemId);
  if (!item) return;

  const topics = item.topics?.map((topic) => `<span>${escapeHtml(topic)}</span>`).join("") || "";
  volumeDetail.innerHTML = `
    <p class="eyebrow">${escapeHtml(item.group)}</p>
    <h2>${escapeHtml(item.title)}</h2>
    <p>${escapeHtml(item.summary)}</p>
    <div class="catalog-meta">
      <span>${escapeHtml(item.status)}</span>
      <span>${escapeHtml(item.level || item.type)}</span>
    </div>
    ${topics ? `<div class="topic-row">${topics}</div>` : ""}
  `;

  if (item.type === "Paper") {
    chapterList.innerHTML = `<p class="markdown-status">${
      item.pdf ? escapeHtml(getLanguage().articles.status.openPdf) : escapeHtml(getLanguage().articles.status.pdfLater)
    }</p>`;
    return;
  }

  if (!item.chapters.length) {
    chapterList.innerHTML = `<p class="markdown-status">${escapeHtml(getLanguage().articles.status.chaptersLater)}</p>`;
    return;
  }

  chapterList.innerHTML = item.chapters
    .map(
      (chapter) => `
        <a class="chapter-card" href="reader.html?series=${encodeURIComponent(item.id)}&chapter=${encodeURIComponent(chapter.id)}">
          <span>${escapeHtml(chapter.title)}</span>
          <small>${escapeHtml(chapter.summary)}</small>
        </a>
      `
    )
    .join("");
};

const renderPage = () => {
  const language = getLanguage();
  applyStaticTranslations(language);
  renderLanguageButtons();
  if (library) {
    renderCurrentItem();
  }
};

const initialize = async () => {
  try {
    const [i18nResponse, libraryResponse] = await Promise.all([
      fetch("data/i18n.json"),
      fetch("data/library.json")
    ]);
    if (!i18nResponse.ok || !libraryResponse.ok) {
      throw new Error("Unable to load catalog.");
    }
    i18nData = await i18nResponse.json();
    library = await libraryResponse.json();
    renderPage();
  } catch (error) {
    bookShelf.innerHTML = '<div class="markdown-status">Catalog could not be loaded.</div>';
  }
};

initialize();
