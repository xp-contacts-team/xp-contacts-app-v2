import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { buildTemplateWorkbook, buildWorkbook, parseContactsWorkbook } from './excel'
import { createContact } from './contacts'
import { makeContactInput } from '../test/factories'

const FIXED_DATE = new Date('2026-11-01T08:00:00.000Z')

function toBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function workbookFromRows(rows: unknown[][]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), '通讯录')
  return workbook
}

describe('Excel export', () => {
  it('writes one row per contact with labeled columns for every method group', () => {
    const contact = createContact(
      makeContactInput({
        name: '陈思远',
        favorite: true,
        methods: [
          { id: 'p1', kind: 'phone', label: '手机', value: '138 0013 8000' },
          { id: 'p2', kind: 'phone', label: '工作', value: '010-8888 6666' },
          { id: 'e1', kind: 'email', label: '工作', value: 'siyuan@example.com' },
          { id: 'e2', kind: 'email', label: '个人', value: 'siyuan@home.com' },
          { id: 's1', kind: 'social', label: '微信', value: 'siyuan_chen' },
          { id: 'a1', kind: 'address', label: '公司', value: '北京市海淀区中关村大街 27 号' },
        ],
      }),
      FIXED_DATE,
    )

    const workbook = buildWorkbook([contact])
    const sheet = workbook.Sheets['通讯录']
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
    const headers = rows[0]

    expect(headers.slice(0, 5)).toEqual(['姓名', '公司', '职位', '收藏', '备注'])
    expect(headers).toContain('电话2号码')
    expect(headers).toContain('邮箱2地址')
    expect(headers).toContain('社交1账号')
    expect(headers).toContain('地址1详细地址')
    expect(rows).toHaveLength(2)
    expect(rows[1][0]).toBe('陈思远')
    expect(rows[1][3]).toBe('是')
    expect(rows[1]).toContain('138 0013 8000')
    expect(workbook.SheetNames).toContain('填写说明')
  })

  it('round-trips multiple methods and notes through import parsing', () => {
    const contact = createContact(
      makeContactInput({
        name: '林晓雨',
        notes: '第一行备注\n第二行备注',
        favorite: true,
        methods: [
          { id: 'p1', kind: 'phone', label: '手机', value: '139 2233 4455' },
          { id: 'e1', kind: 'email', label: '个人', value: 'xiaoyu@example.com' },
          { id: 's1', kind: 'social', label: '小红书', value: '小雨画画' },
          { id: 'a1', kind: 'address', label: '家庭', value: '杭州市西湖区文三路 128 号' },
        ],
      }),
      FIXED_DATE,
    )

    const parsed = parseContactsWorkbook(toBuffer(buildWorkbook([contact])))

    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].name).toBe('林晓雨')
    expect(parsed.rows[0].favorite).toBe(true)
    expect(parsed.rows[0].notes).toBe('第一行备注\n第二行备注')
    expect(parsed.rows[0].methods).toHaveLength(4)
    expect(parsed.rows[0].methods.map((method) => method.kind)).toEqual([
      'phone',
      'email',
      'social',
      'address',
    ])
  })

  it('provides a template with the same importable headers', () => {
    const workbook = buildTemplateWorkbook()
    const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['通讯录'], { header: 1 })
    expect(rows[0][0]).toBe('姓名')
    expect(rows[0]).toContain('收藏')
    expect(rows[0]).toContain('电话2号码')

    const parsed = parseContactsWorkbook(toBuffer(workbook))
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors[0].message).toContain('没有找到可导入的联系人')
  })
})

describe('Excel import', () => {
  it('reads numbered Chinese headers with labels and favorite flags', () => {
    const workbook = workbookFromRows([
      ['姓名', '电话1标签', '电话1号码', '电话2标签', '电话2号码', '邮箱1标签', '邮箱1地址', '收藏'],
      ['张三', '手机', '138 0000 0000', '工作', '010-1234 5678', '工作', 'zhangsan@example.com', '是'],
      ['李四', '手机', '139 1111 2222', '', '', '', '', '否'],
    ])

    const parsed = parseContactsWorkbook(toBuffer(workbook))

    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].methods).toHaveLength(3)
    expect(parsed.rows[0].methods[1]).toMatchObject({ kind: 'phone', label: '工作' })
    expect(parsed.rows[0].favorite).toBe(true)
    expect(parsed.rows[1].favorite).toBe(false)
  })

  it('accepts common English headers and plain phone / email columns', () => {
    const workbook = workbookFromRows([
      ['Name', 'Company', 'Job Title', 'Phone', 'Email', 'Favorite', 'Notes'],
      ['Alice', 'Acme', 'Engineer', '+1 555 0100', 'alice@example.com', 'yes', 'Met at conference'],
    ])

    const parsed = parseContactsWorkbook(toBuffer(workbook))

    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      name: 'Alice',
      company: 'Acme',
      jobTitle: 'Engineer',
      favorite: true,
      notes: 'Met at conference',
    })
    expect(parsed.rows[0].methods).toHaveLength(2)
  })

  it('skips rows without a name and reports their row numbers', () => {
    const workbook = workbookFromRows([
      ['姓名', '备注'],
      ['', '缺少姓名'],
      ['王五', '有效行'],
    ])

    const parsed = parseContactsWorkbook(toBuffer(workbook))

    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].name).toBe('王五')
    expect(parsed.errors).toHaveLength(1)
    expect(parsed.errors[0].row).toBe(2)
  })

  it('fails clearly when the workbook has no name column', () => {
    const workbook = workbookFromRows([
      ['公司', '电话'],
      ['示例科技', '138 0000 0000'],
    ])
    const parsed = parseContactsWorkbook(toBuffer(workbook))

    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors[0].message).toContain('姓名')
  })

  it('ignores unknown columns and reports them as warnings', () => {
    const workbook = workbookFromRows([
      ['姓名', '神秘字段'],
      ['赵六', '忽略我'],
    ])
    const parsed = parseContactsWorkbook(toBuffer(workbook))

    expect(parsed.rows).toHaveLength(1)
    expect(parsed.ignoredHeaders).toEqual(['神秘字段'])
    expect(parsed.warnings.some((warning) => warning.includes('神秘字段'))).toBe(true)
  })

  it('rejects empty or unreadable workbooks', () => {
    expect(parseContactsWorkbook(new Uint8Array([1, 2, 3, 4])).errors).not.toHaveLength(0)
    expect(parseContactsWorkbook(toBuffer(workbookFromRows([]))).errors).not.toHaveLength(0)
  })

  it('parses the bundled demo fixture used by the screenshot script', () => {
    const data = readFileSync(resolve(process.cwd(), 'docs/fixtures/Atlas-import-sample.xlsx'))
    const parsed = parseContactsWorkbook(data)

    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.rows.map((row) => row.name)).toEqual(['顾清', '沈舟', '唐宁'])
    expect(parsed.rows[0].favorite).toBe(true)
    expect(parsed.rows[0].methods).toHaveLength(7)
    expect(parsed.rows[1].methods).toHaveLength(4)
  })
})
