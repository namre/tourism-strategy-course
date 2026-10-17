// Сборка документов Word по ГОСТ 7.32-2017 (отчёты и учебные работы). Работает и в браузере (window.docx), и в Node (import 'docx').
// Поля: левое 30 мм, правое 15 мм, верхнее и нижнее 20 мм; Times New Roman 14 пт; интервал 1,5; абзацный отступ 1,25 см;
// номер страницы внизу по центру, на титульном листе не ставится; структурные элементы — прописными по центру с новой страницы.
export const UNIVERSITY = {
  agency: 'ФЕДЕРАЛЬНОЕ АГЕНТСТВО ПО РЫБОЛОВСТВУ',
  form: 'Федеральное государственное бюджетное образовательное учреждение высшего образования',
  name: '«Астраханский государственный технический университет»',
  institute: 'Институт рыбного хозяйства, биологии и природопользования',
  department: 'Кафедра «Экологический туризм»',
  program: 'Направление подготовки 43.04.02 Туризм, направленность «Инновационные технологии экологического туризма»',
  discipline: 'Маркетинговые стратегии в сфере туризма',
  city: 'Астрахань',
};
const MM = 56.7; // dxa в 1 мм
const FONT = 'Times New Roman';

export function buildGostDoc(D, opt) {
  const {Document, Paragraph, TextRun, AlignmentType, Footer, PageNumber, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle, TableOfContents, HeadingLevel, ShadingType, LineRuleType} = D;
  const year = opt.year || new Date().getFullYear();
  const body = (text, o = {}) => new Paragraph({alignment: o.align ?? AlignmentType.JUSTIFIED, indent: o.noIndent ? undefined : {firstLine: Math.round(12.5 * MM)}, spacing: {line: 360, before: 0, after: 0}, keepNext: o.keepNext,
    children: (Array.isArray(text) ? text : [text]).map(t => typeof t === 'string' ? new TextRun({text: t, font: FONT, size: 28, italics: o.hint, color: o.hint ? '6B6B6B' : undefined, bold: o.bold}) : t)});
  const center = (text, o = {}) => new Paragraph({alignment: AlignmentType.CENTER, spacing: {line: o.line ?? 276, before: o.before ?? 0, after: o.after ?? 0}, children: [new TextRun({text, font: FONT, size: o.size ?? 28, bold: o.bold, allCaps: o.caps})]});
  const structural = (text, o = {}) => new Paragraph({heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, pageBreakBefore: o.pageBreak !== false, spacing: {line: 360, before: 0, after: 240}, keepNext: true,
    children: [new TextRun({text: text.toUpperCase(), font: FONT, size: 28, bold: true, color: '000000'})]});
  const section = (text, level = 1, o = {}) => new Paragraph({heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, pageBreakBefore: level === 1 && o.pageBreak !== false, indent: {firstLine: Math.round(12.5 * MM)}, spacing: {line: 360, before: level === 1 ? 0 : 240, after: 240}, keepNext: true,
    children: [new TextRun({text, font: FONT, size: 28, bold: true, color: '000000'})]});
  const border = {style: BorderStyle.SINGLE, size: 4, color: '000000'};
  const borders = {top: border, bottom: border, left: border, right: border};
  const TABLE_W = Math.round(165 * MM); // 210 − 30 − 15 мм
  let tableNo = 0;
  const table = (caption, header, rows, widths) => {
    tableNo++;
    const total = widths.reduce((a, b) => a + b, 0), cols = widths.map(w => Math.round(w / total * TABLE_W));
    cols[cols.length - 1] += TABLE_W - cols.reduce((a, b) => a + b, 0);
    const cell = (t, i, head) => new TableCell({borders, width: {size: cols[i], type: WidthType.DXA}, margins: {top: 40, bottom: 40, left: 80, right: 80}, shading: head ? {fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto'} : undefined,
      children: [new Paragraph({alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: {line: 240}, children: [new TextRun({text: String(t ?? ''), font: FONT, size: 24, bold: head, italics: !head && opt.template && !String(t ?? '').trim() ? false : undefined})]})]});
    return [
      new Paragraph({spacing: {line: 360, before: 120, after: 0}, keepNext: true, children: [new TextRun({text: `Таблица ${tableNo} – ${caption}`, font: FONT, size: 28})]}),
      new Table({width: {size: TABLE_W, type: WidthType.DXA}, columnWidths: cols, rows: [new TableRow({tableHeader: true, children: header.map((h, i) => cell(h, i, true))}), ...rows.map(r => new TableRow({children: r.map((t, i) => cell(t, i, false))}))]}),
      new Paragraph({spacing: {line: 360, after: 120}, children: []}),
    ];
  };
  const title = [
    center(UNIVERSITY.agency, {size: 24}), center(UNIVERSITY.form, {size: 24}), center(UNIVERSITY.name, {size: 24, bold: true}),
    center(UNIVERSITY.institute, {size: 24, before: 120}), center(UNIVERSITY.department, {size: 24}),
    center(opt.workType.toUpperCase(), {bold: true, before: 2600, size: 32}),
    center(`по дисциплине «${UNIVERSITY.discipline}»`, {before: 120}),
    ...(opt.topic ? [center(`на тему: ${opt.topic}`, {before: 120})] : []),
    center(UNIVERSITY.program, {size: 24, before: 240}),
    ...['Выполнил(а):', `обучающийся группы ${opt.group || '________'}`, opt.student || '______________ (Ф. И. О.)', '', 'Проверил(а):', opt.supervisor || '______________', opt.supervisor ? '' : '(должность, Ф. И. О.)', '', 'Оценка: ________', 'Дата: __________']
      .map((t, i) => new Paragraph({indent: {left: Math.round(95 * MM)}, spacing: {line: 276, before: i === 0 ? 1400 : 0}, children: [new TextRun({text: t, font: FONT, size: 28})]})),
    new Paragraph({alignment: AlignmentType.CENTER, spacing: {before: 1200}, children: [new TextRun({text: `${UNIVERSITY.city} ${year}`, font: FONT, size: 28})]}),
  ];
  const content = [];
  if (opt.toc) content.push(structural('Содержание'), new TableOfContents('Содержание', {hyperlink: true, headingStyleRange: '1-2'}), body('Чтобы обновить содержание, щёлкните по нему правой кнопкой мыши и выберите «Обновить поле».', {hint: true, noIndent: true}));
  for (const b of opt.blocks) {
    if (b.structural) content.push(structural(b.structural, b));
    else if (b.section) content.push(section(b.section, b.level || 1, b));
    else if (b.table) content.push(...table(b.table, b.header, b.rows, b.widths || b.header.map(() => 1)));
    else if (b.hint) content.push(body(b.hint, {hint: true}));
    else if (b.list) b.list.forEach((t, i) => content.push(body(`${b.ordered ? (i + 1) + ')' : '–'} ${t}`)));
    else if (b.text !== undefined) String(b.text || '').split(/\n+/).filter(s => s.trim() || b.keepEmpty).forEach(t => content.push(body(t)));
  }
  return new Document({
    creator: opt.student || 'Обучающийся', title: opt.workType, description: UNIVERSITY.discipline,
    features: {updateFields: !!opt.toc},
    styles: {default: {document: {run: {font: FONT, size: 28}}}, paragraphStyles: [
      {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {font: FONT, size: 28, bold: true, color: '000000'}, paragraph: {spacing: {line: 360, after: 240}, outlineLevel: 0}},
      {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {font: FONT, size: 28, bold: true, color: '000000'}, paragraph: {spacing: {line: 360, before: 240, after: 240}, outlineLevel: 1}}]},
    sections: [{
      properties: {titlePage: true, page: {size: {width: Math.round(210 * MM), height: Math.round(297 * MM)}, margin: {top: Math.round(20 * MM), bottom: Math.round(20 * MM), left: Math.round(30 * MM), right: Math.round(15 * MM), footer: Math.round(10 * MM)}}},
      footers: {first: new Footer({children: [new Paragraph({children: []})]}), default: new Footer({children: [new Paragraph({alignment: AlignmentType.CENTER, children: [new TextRun({children: [PageNumber.CURRENT], font: FONT, size: 28})]})]})},
      children: [...title, ...content],
    }],
  });
}

// Примеры оформления источников по ГОСТ Р 7.0.100-2018 — для шаблонов и подсказок.
export const SOURCE_EXAMPLES = [
  'Налоговый кодекс Российской Федерации (часть вторая) : Федеральный закон от 05.08.2000 № 117-ФЗ : глава 33.1 «Туристический налог». – Текст : электронный // КонсультантПлюс : справочная правовая система. – URL: https://www.consultant.ru (дата обращения: ДД.ММ.ГГГГ).',
  'Гончарова, И. В. Маркетинг туризма : учебное пособие / И. В. Гончарова, Т. П. Розанова, М. А. Морозов, Н. С. Морозова. – Москва : Федеральное агентство по туризму, 2014. – 224 с. – Текст : непосредственный.',
  'Скобкин, С. С. Маркетинг и продажи в гостиничном бизнесе : учебник для вузов / С. С. Скобкин. – 3-е изд., испр. и доп. – Москва : Юрайт, 2025. – 212 с. – (Высшее образование). – URL: https://urait.ru/bcode/563339 (дата обращения: ДД.ММ.ГГГГ). – Текст : электронный.',
  'Туризм : официальная статистика // Федеральная служба государственной статистики : официальный сайт. – URL: https://rosstat.gov.ru/statistics/turizm (дата обращения: ДД.ММ.ГГГГ). – Текст : электронный.',
];
