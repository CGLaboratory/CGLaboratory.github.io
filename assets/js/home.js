const renderTargets = {
  languages: document.querySelector('[data-render="languages"]'),
  learningMap: document.querySelector('[data-render="learning-map"]'),
  contentTypes: document.querySelector('[data-render="content-types"]'),
  contributeSteps: document.querySelector('[data-render="contributeSteps"]')
};

let i18nData = null;
let currentLanguage = localStorage.getItem("cgl-language") || "en";

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
  document.title = language.meta.title;

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
  renderTargets.languages.innerHTML = languageCodes
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

  renderTargets.languages.querySelectorAll(".language-option").forEach((button) => {
    button.addEventListener("click", () => {
      currentLanguage = button.dataset.lang;
      localStorage.setItem("cgl-language", currentLanguage);
      renderLanguage();
    });
  });
};

const renderLearningMap = (items) => {
  renderTargets.learningMap.innerHTML = items
    .map(
      (item, index) => `
        <article class="map-item">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
};

const renderContentTypes = (items) => {
  renderTargets.contentTypes.innerHTML = items
    .map(
      (item) => `
        <article class="content-type-card ${escapeHtml(item.accent)}">
          <strong>${escapeHtml(item.label)}</strong>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `
    )
    .join("");
};

const renderContributeSteps = (items) => {
  renderTargets.contributeSteps.innerHTML = items
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </li>
      `
    )
    .join("");
};

const renderLanguage = () => {
  const language = getLanguage();
  applyStaticTranslations(language);
  renderLanguageButtons();
  renderLearningMap(language.learningMap.items);
  renderContentTypes(language.contentTypes.items);
  renderContributeSteps(language.contribute.steps);
};

const initialize = async () => {
  try {
    const response = await fetch("data/i18n.json");
    if (!response.ok) {
      throw new Error("Unable to load site data.");
    }
    i18nData = await response.json();
    renderLanguage();
  } catch (error) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div class="markdown-status">Site data could not be loaded. Open the site through a local server or GitHub Pages.</div>'
    );
  }
};

initialize();
