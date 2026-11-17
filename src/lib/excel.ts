import * as XLSX from 'xlsx'
import type { Contact, ContactInput, ContactMethod, ContactMethodKind, ImportMode } from '../types'
import { METHOD_KINDS } from '../types'
import { METHOD_META } from './labels'
import { makeId } from './id'

const SHEET_NAME = '通讯录'
const GUIDE_SHEET = '填写说明'

const SELECTED_KIND_META: Record<
  ContactMethodKind,
  { title: string; labelSuffix: string; valueSuffix: string; valueWidth: number }
> = {
  phone: { title: '电话', labelSuffix: '标签', valueSuffix: '号码', valueWidth: 20 },
  email: { title: '邮箱', labelSuffix: '标签', valueSuffix: '地址', valueWidth: 30 },
  social: { title: '社交', labelSuffix: '标签', valueSuffix: '账号', valueWidth: 22 },
  address: { title: '地址', labelSuffix: '标签', valueSuffix: '详细地址', valueWidth: 40 },
}

const BASIC_HEADERS = ['姓名', '公司', '职位', '收藏', '备注'] as const

const BASIC_WIDTHS = [16, 24, 18, 8, 36]

const FIELD_ALIASES = {
  name: ['姓名', '名字', '联系人', '联系人姓名', 'name', 'fullname', 'contactname'],
  company: ['公司', '单位', '公司名称', 'organization', 'organisation', 'company'],
  jobTitle: ['职位', '职务', '岗位', 'jobtitle', 'title', 'position'],
  favorite: ['收藏', '是否收藏', '收藏状态', 'favorite', 'favourite', 'starred', 'bookmark'],
  notes: ['备注', '说明', '注释', 'notes', 'note', 'memo', 'remark'],
} as const

type BasicField = keyof typeof FIELD_ALIASES

const KIND_ALIASES: Record<ContactMethodKind, string[]> = {
  phone: [
    '电话',
    '手机',
    '电话号码',
    '手机号码',
    '联系电话',
    'phone',
    'mobile',
    'tel',
    'telephone',
  ],
  email: ['邮箱', '邮件', '电子邮箱', '电子邮件', 'email', 'e-mail', 'mail'],
  social: ['社交', '社交账号', '微信', 'wechat', 'qq', '微博', 'weibo', 'linkedin', 'social'],
  address: ['地址', '住址', '详细地址', 'address', 'location'],
}

const NAME_HEADERS = new Set(FIELD_ALIASES.name.map(normalizeHeader))

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s*＊:：.。、/\\|_-]/g, '')
    .trim()
}

function normalizedKindAliases(kind: ContactMethodKind): string[] {
  return KIND_ALIASES[kind].map(normalizeHeader).sort((a, b) => b.length - a.length)
}

function defaultLabelForAlias(kind: ContactMethodKind, alias: string): string {
  if (kind === 'social') {
    if (alias === 'qq') return 'QQ'
    if (alias === 'weibo' || alias === '微博') return '微博'
    if (alias === 'linkedin') return 'LinkedIn'
    if (alias === 'wechat' || alias === '微信') return '微信'
  }
  return METHOD_META[kind].defaultLabel
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function maxMethodCounts(contacts: Contact[]): Record<ContactMethodKind, number> {
  const counts: Record<ContactMethodKind, number> = {
    phone: 2,
    email: 2,
    social: 2,
    address: 2,
  }
  for (const contact of contacts) {
    for (const kind of METHOD_KINDS) {
      counts[kind] = Math.max(
        counts[kind],
        contact.methods.filter((method) => method.kind === kind).length,
      )
    }
  }
  return counts
}

export function buildHeaders(contacts: Contact[] = []): string[] {
  const counts = maxMethodCounts(contacts)
  const headers: string[] = [...BASIC_HEADERS]
  for (const kind of METHOD_KINDS) {
    const meta = SELECTED_KIND_META[kind]
    for (let index = 1; index <= counts[kind]; index += 1) {
      headers.push(
        `${meta.title}${index}${meta.labelSuffix}`,
        `${meta.title}${index}${meta.valueSuffix}`,
      )
    }
  }
  return headers
}

function headerWidths(headers: string[]): XLSX.ColInfo[] {
  return headers.map((header, index) => {
    if (index < BASIC_WIDTHS.length) return { wch: BASIC_WIDTHS[index] }
    if (header.includes('详细地址')) return { wch: 40 }
    if (header.includes('标签')) return { wch: 13 }
    return { wch: 22 }
  })
}

function contactRow(contact: Contact, counts: Record<ContactMethodKind, number>): string[] {
  const row: string[] = [
    contact.name,
    contact.company,
    contact.jobTitle,
    contact.favorite ? '是' : '否',
    contact.notes,
  ]

  for (const kind of METHOD_KINDS) {
    const methods = contact.methods.filter((method) => method.kind === kind)
    for (let index = 0; index < counts[kind]; index += 1) {
      const method = methods[index]
      row.push(method?.label ?? '', method?.value ?? '')
    }
  }

  return row
}

function addGuideSheet(workbook: XLSX.WorkBook, exportedCount: number): void {
  const rows: (string | number)[][] = [
    ['Atlas 通讯录 · Excel 导出说明'],
    ['导出时间', new Date().toISOString()],
    ['联系人数量', exportedCount],
    [],
    ['字段', '说明'],
    ['姓名', '必填。导入时缺少姓名的行会被跳过。'],
    ['公司 / 职位 / 备注', '选填。'],
    ['收藏', '“是”或“否”；也兼容 true / false。'],
    ['电话 / 邮箱 / 社交 / 地址', '每种联系方式可有多条，按序号分列保存，每列都有标签与内容。'],
    [],
    ['导入方式', '打开 Atlas 通讯录，点击“导入”，选择本文件或按相同表头准备的 .xlsx 文件。'],
    ['兼容性', '表头支持中英文及常见同义词；多余的列会被忽略。'],
  ]
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 28 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(workbook, sheet, GUIDE_SHEET)
}

export function buildWorkbook(contacts: Contact[]): XLSX.WorkBook {
  const headers = buildHeaders(contacts)
  const counts = maxMethodCounts(contacts)
  const rows: string[][] = [headers, ...contacts.map((contact) => contactRow(contact, counts))]

  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: 'Atlas 通讯录',
    Subject: 'EE308FZ 极限编程作业 · 通讯录导出',
    Author: 'Atlas Team',
    CreatedDate: new Date(),
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  sheet['!cols'] = headerWidths(headers)
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: headers.length - 1 },
    }),
  }

  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME)
  addGuideSheet(workbook, contacts.length)
  return workbook
}

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const headers = buildHeaders([])
  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: 'Atlas 通讯录导入模板',
    Subject: '按此表头填写后导入 Atlas 通讯录',
    Author: 'Atlas Team',
    CreatedDate: new Date(),
  }
  const sheet = XLSX.utils.aoa_to_sheet([headers])
  sheet['!cols'] = headerWidths(headers)
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME)

  const guide = XLSX.utils.aoa_to_sheet([
    ['Atlas 通讯录 · 导入模板说明'],
    [],
    ['1', '请在“通讯录”工作表中从第 2 行开始填写，每个联系人占一行。'],
    ['2', '“姓名”为必填列；公司、职位、备注、收藏为选填列。'],
    [
      '3',
      '每种联系方式默认提供 2 组列；如需要更多，可复制“电话1标签 / 电话1号码”为“电话3标签 / 电话3号码”。',
    ],
    ['4', '“收藏”填写“是”或“否”。'],
    ['5', '保存为 .xlsx 后，在 Atlas 通讯录中点击“导入”选择该文件。'],
    ['6', '也兼容英文表头，例如 Name / Company / Phone / Email / Favorite。'],
    [],
    [
      '示例（可删除）',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      '张三',
      '示例科技',
      '产品经理',
      '是',
      '这是一条示例，导入前请删除',
      '手机',
      '138 0000 0000',
      '工作',
      '010-0000 0000',
      '工作',
      'zhangsan@example.com',
      '',
      '',
      '微信',
      'zhangsan_demo',
      '',
      '',
      '公司',
      '北京市朝阳区示例路 1 号',
      '',
      '',
    ],
  ])
  guide['!cols'] = [{ wch: 12 }, { wch: 100 }]
  XLSX.utils.book_append_sheet(workbook, guide, GUIDE_SHEET)
  return workbook
}

function exportFileName(prefix: string): string {
  const date = new Date()
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
  return `${prefix}_${stamp}.xlsx`
}

export function exportContactsToExcel(
  contacts: Contact[],
  filename = exportFileName('Atlas通讯录'),
): void {
  XLSX.writeFile(buildWorkbook(contacts), filename, { compression: true })
}

export function downloadImportTemplate(): void {
  XLSX.writeFile(buildTemplateWorkbook(), exportFileName('Atlas通讯录导入模板'), {
    compression: true,
  })
}

type Binding =
  | { type: 'field'; field: BasicField }
  | {
      type: 'method'
      kind: ContactMethodKind
      index: number
      part: 'label' | 'value'
      defaultLabel: string
    }

interface HeaderParse {
  bindings: Map<number, Binding>
  ignored: string[]
  warnings: string[]
  hasName: boolean
}

function parseHeaderRow(row: unknown[]): HeaderParse {
  const bindings = new Map<number, Binding>()
  const ignored: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  let hasName = false

  row.forEach((raw, columnIndex) => {
    const header = toText(raw)
    const normalized = normalizeHeader(header)
    if (!normalized) return

    const basicField = (Object.keys(FIELD_ALIASES) as BasicField[]).find((field) =>
      (FIELD_ALIASES[field] as readonly string[]).some(
        (alias) => normalizeHeader(alias) === normalized,
      ),
    )

    if (basicField) {
      const key = `field:${basicField}`
      if (seen.has(key)) {
        warnings.push(`表头“${header}”重复，已忽略后出现的列。`)
        return
      }
      seen.add(key)
      bindings.set(columnIndex, { type: 'field', field: basicField })
      if (basicField === 'name') hasName = true
      return
    }

    for (const kind of METHOD_KINDS) {
      for (const alias of normalizedKindAliases(kind)) {
        const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const match = normalized.match(
          new RegExp(
            `^${escaped}(\\d{0,2})(标签|label|号码|number|地址|账号|account|value|内容|详细地址)?$`,
          ),
        )
        if (!match) continue

        const index = match[1] ? Math.max(1, Number.parseInt(match[1], 10)) : 1
        const suffix = match[2] ?? ''
        const part: 'label' | 'value' = ['标签', 'label'].includes(suffix) ? 'label' : 'value'
        const key = `method:${kind}:${index}:${part}`
        if (seen.has(key)) {
          warnings.push(`表头“${header}”重复，已忽略后出现的列。`)
          return
        }
        seen.add(key)
        bindings.set(columnIndex, {
          type: 'method',
          kind,
          index,
          part,
          defaultLabel: defaultLabelForAlias(kind, alias),
        })
        return
      }
    }

    ignored.push(header)
  })

  return { bindings, ignored, warnings, hasName }
}

export interface ImportIssue {
  row?: number
  message: string
}

export interface ImportedContact extends ContactInput {
  rowNumber: number
}

export interface ImportParseResult {
  rows: ImportedContact[]
  errors: ImportIssue[]
  warnings: string[]
  ignoredHeaders: string[]
  sheetName: string
}

const TRUTHY = new Set(['是', 'true', 'yes', 'y', '1', '收藏', '★', 'starred', 'favorite'])

function parseFavorite(value: unknown): boolean {
  return TRUTHY.has(toText(value).toLowerCase())
}

export function parseContactsWorkbook(data: ArrayBuffer | Uint8Array): ImportParseResult {
  const result: ImportParseResult = {
    rows: [],
    errors: [],
    warnings: [],
    ignoredHeaders: [],
    sheetName: '',
  }

  let workbook: XLSX.WorkBook
  try {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    workbook = XLSX.read(bytes, { type: 'array' })
  } catch {
    result.errors.push({ message: '无法读取该文件，请确认它是有效的 .xlsx 或 .xls 文件。' })
    return result
  }

  if (workbook.SheetNames.length === 0) {
    result.errors.push({ message: '文件中没有工作表。' })
    return result
  }

  const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  result.sheetName = sheetName

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  })

  if (matrix.length === 0) {
    result.errors.push({ message: '工作表是空的，没有可导入的数据。' })
    return result
  }

  let headerIndex = -1
  for (let index = 0; index < Math.min(matrix.length, 10); index += 1) {
    if (matrix[index].some((cell) => NAME_HEADERS.has(normalizeHeader(toText(cell))))) {
      headerIndex = index
      break
    }
  }

  if (headerIndex === -1) {
    result.errors.push({
      message: '未找到“姓名”列。请使用 Atlas 提供的模板，或确认表头包含“姓名 / Name”。',
    })
    return result
  }

  const header = parseHeaderRow(matrix[headerIndex])
  result.ignoredHeaders = header.ignored
  result.warnings.push(...header.warnings)

  if (!header.hasName) {
    result.errors.push({ message: '未找到“姓名”列。' })
    return result
  }

  if (header.ignored.length > 0) {
    result.warnings.push(`以下列无法识别，已忽略：${header.ignored.join('、')}。`)
  }

  const nameBinding = [...header.bindings.entries()].find(
    ([, binding]) => binding.type === 'field' && binding.field === 'name',
  )
  if (!nameBinding) {
    result.errors.push({ message: '未找到“姓名”列。' })
    return result
  }
  const nameColumn = nameBinding[0]

  for (let rowIndex = headerIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex]
    const rowNumber = rowIndex + 1
    if (!row || row.every((cell) => toText(cell) === '')) continue

    const name = toText(row[nameColumn])
    if (!name) {
      result.errors.push({ row: rowNumber, message: `第 ${rowNumber} 行缺少姓名，已跳过。` })
      continue
    }

    const fields: Partial<Record<BasicField, string>> = {}
    const methodParts = new Map<
      string,
      { kind: ContactMethodKind; index: number; label: string; value: string; defaultLabel: string }
    >()

    for (const [columnIndex, binding] of header.bindings) {
      const value = toText(row[columnIndex])
      if (binding.type === 'field') {
        fields[binding.field] = value
        continue
      }

      const key = `${binding.kind}:${binding.index}`
      const entry = methodParts.get(key) ?? {
        kind: binding.kind,
        index: binding.index,
        label: '',
        value: '',
        defaultLabel: binding.defaultLabel,
      }
      if (binding.part === 'label') {
        entry.label = value
      } else {
        entry.value = value
      }
      methodParts.set(key, entry)
    }

    const methods: ContactMethod[] = [...methodParts.values()]
      .filter((entry) => entry.value !== '')
      .sort(
        (a, b) => METHOD_KINDS.indexOf(a.kind) - METHOD_KINDS.indexOf(b.kind) || a.index - b.index,
      )
      .map((entry) => ({
        id: makeId('method'),
        kind: entry.kind,
        label: entry.label || entry.defaultLabel,
        value: entry.value,
      }))

    result.rows.push({
      rowNumber,
      name,
      company: fields.company ?? '',
      jobTitle: fields.jobTitle ?? '',
      notes: fields.notes ?? '',
      favorite: parseFavorite(fields.favorite),
      methods,
    })
  }

  if (result.rows.length === 0 && result.errors.length === 0) {
    result.errors.push({ message: '没有找到可导入的联系人记录。' })
  }

  return result
}

export function importSummary(
  rowCount: number,
  result: { added: number; merged: number; skipped: number },
): string {
  const parts = [`导入 ${rowCount} 行`]
  if (result.added) parts.push(`新增 ${result.added}`)
  if (result.merged) parts.push(`合并 ${result.merged}`)
  if (result.skipped) parts.push(`跳过 ${result.skipped}`)
  return parts.join(' · ')
}

export type { ImportMode }
