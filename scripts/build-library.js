const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const seriesRoot = path.join(root, "content", "series");
const papersFile = path.join(root, "content", "papers", "papers.yaml");
const outputFile = path.join(root, "data", "library.json");

const isScalar = (value) => !value.includes(": ") && !value.startsWith("- ");

const parseScalar = (value) => {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed === "\"\"") return "";
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const countIndent = (line) => line.match(/^ */)[0].length;

const parseBlock = (lines, startIndex, indent) => {
  const container = {};
  let index = startIndex;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      index += 1;
      continue;
    }

    const currentIndent = countIndent(rawLine);
    if (currentIndent < indent) break;
    if (currentIndent > indent) {
      throw new Error(`Unexpected indentation near: ${rawLine}`);
    }

    const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(trimmed);
    if (!match) {
      throw new Error(`Unsupported YAML line: ${rawLine}`);
    }

    const [, key, rest = ""] = match;
    if (rest) {
      container[key] = parseScalar(rest);
      index += 1;
      continue;
    }

    const next = nextContentLine(lines, index + 1);
    if (!next || next.indent <= currentIndent) {
      container[key] = null;
      index += 1;
      continue;
    }

    if (next.trimmed.startsWith("- ")) {
      const result = parseList(lines, next.index, next.indent);
      container[key] = result.value;
      index = result.nextIndex;
    } else {
      const result = parseBlock(lines, next.index, next.indent);
      container[key] = result.value;
      index = result.nextIndex;
    }
  }

  return { value: container, nextIndex: index };
};

const parseList = (lines, startIndex, indent) => {
  const list = [];
  let index = startIndex;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      index += 1;
      continue;
    }

    const currentIndent = countIndent(rawLine);
    if (currentIndent < indent) break;
    if (currentIndent !== indent || !trimmed.startsWith("- ")) {
      break;
    }

    const itemText = trimmed.slice(2).trim();
    if (!itemText) {
      const result = parseBlock(lines, index + 1, indent + 2);
      list.push(result.value);
      index = result.nextIndex;
      continue;
    }

    if (isScalar(itemText)) {
      list.push(parseScalar(itemText));
      index += 1;
      continue;
    }

    const inlineMatch = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(itemText);
    if (!inlineMatch) {
      throw new Error(`Unsupported YAML list item: ${rawLine}`);
    }

    const item = {};
    const [, key, rest = ""] = inlineMatch;
    item[key] = rest ? parseScalar(rest) : null;
    index += 1;

    while (index < lines.length) {
      const childLine = lines[index];
      const childTrimmed = childLine.trim();

      if (!childTrimmed || childTrimmed.startsWith("#")) {
        index += 1;
        continue;
      }

      const childIndent = countIndent(childLine);
      if (childIndent <= indent) break;
      if (childIndent !== indent + 2) {
        throw new Error(`Unexpected indentation near: ${childLine}`);
      }

      const childMatch = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(childTrimmed);
      if (!childMatch) {
        throw new Error(`Unsupported YAML child line: ${childLine}`);
      }

      const [, childKey, childRest = ""] = childMatch;
      if (childRest) {
        item[childKey] = parseScalar(childRest);
        index += 1;
        continue;
      }

      const next = nextContentLine(lines, index + 1);
      if (!next || next.indent <= childIndent) {
        item[childKey] = null;
        index += 1;
        continue;
      }

      if (next.trimmed.startsWith("- ")) {
        const result = parseList(lines, next.index, next.indent);
        item[childKey] = result.value;
        index = result.nextIndex;
      } else {
        const result = parseBlock(lines, next.index, next.indent);
        item[childKey] = result.value;
        index = result.nextIndex;
      }
    }

    list.push(item);
  }

  return { value: list, nextIndex: index };
};

const nextContentLine = (lines, startIndex) => {
  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed && !trimmed.startsWith("#")) {
      return { index, indent: countIndent(lines[index]), trimmed };
    }
  }
  return null;
};

const parseYamlFile = (filePath) => {
  const text = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  return parseBlock(text.split("\n"), 0, 0).value;
};

const toPosixPath = (filePath) => filePath.split(path.sep).join("/");

const requireFile = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${path.relative(root, filePath)}`);
  }
};

const loadSeries = () => {
  if (!fs.existsSync(seriesRoot)) return [];

  return fs
    .readdirSync(seriesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(seriesRoot, entry.name);
      const yamlPath = path.join(dir, "series.yaml");
      requireFile(yamlPath, "series metadata");

      const series = parseYamlFile(yamlPath);
      const chapters = (series.chapters || []).map((chapter) => {
        const chapterPath = path.join(dir, chapter.file);
        requireFile(chapterPath, "chapter markdown");
        return {
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          path: toPosixPath(path.relative(root, chapterPath)),
          featured: chapter.featured === true
        };
      });

      return {
        id: series.id || entry.name,
        title: series.title,
        order: Number(series.order || 999),
        type: series.type || "Series Tutorial",
        status: series.status || "Planned",
        level: series.level || "",
        color: series.color || "blue",
        summary: series.summary || "",
        topics: series.topics || [],
        featured: series.featured === true,
        chapters
      };
    });
};

const loadPapers = () => {
  if (!fs.existsSync(papersFile)) return [];
  return parseYamlFile(papersFile).papers || [];
};

const stripInternalFields = (series) =>
  series.map(({ featured, order, chapters, ...rest }) => ({
    ...rest,
    chapters: chapters.map(({ featured: chapterFeatured, ...chapter }) => chapter)
  }));

const series = loadSeries().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
const featuredChapters = series.flatMap((item) =>
  item.chapters
    .filter((chapter) => item.featured || chapter.featured)
    .map(({ featured, ...chapter }) => chapter)
);

const library = {
  featuredChapters,
  series: stripInternalFields(series),
  papers: loadPapers()
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(library, null, 2)}\n`, "utf8");
console.log(`Generated ${path.relative(root, outputFile)} from ${series.length} series.`);
