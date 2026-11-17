import { useRef, useState, type DragEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileWarning,
  Loader2,
  RotateCcw,
  Star,
  Upload,
} from 'lucide-react'
import type { ImportMode } from '../types'
import type { ImportedContact, ImportParseResult } from '../lib/excel'
import { parseContactsWorkbook } from '../lib/excel'
import { METHOD_META } from '../lib/labels'
import { Modal } from './Modal'

interface ImportDialogProps {
  open: boolean
  existingCount: number
  onClose: () => void
  onImport: (rows: ImportedContact[], mode: ImportMode) => void
  onDownloadTemplate: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function ImportDialog({
  open,
  existingCount,
  onClose,
  onImport,
  onDownloadTemplate,
}: ImportDialogProps) {
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportParseResult | null>(null)
  const [parseError, setParseError] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [reading, setReading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)

  const handleFile = async (file: File) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setResult(null)
      setParseError('请选择 .xlsx 或 .xls 格式的 Excel 文件。')
      setFileName(file.name)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setResult(null)
      setParseError('文件超过 10 MB，请拆分后再导入。')
      setFileName(file.name)
      return
    }

    setFileName(file.name)
    setResult(null)
    setParseError('')
    setReading(true)

    try {
      const buffer = await file.arrayBuffer()
      if (requestRef.current !== requestId) return
      const parsed = parseContactsWorkbook(buffer)
      setResult(parsed)
    } catch {
      if (requestRef.current !== requestId) return
      setParseError('读取文件时出现问题，请确认文件没有损坏后重试。')
    } finally {
      if (requestRef.current === requestId) setReading(false)
    }
  }

  const openPicker = () => inputRef.current?.click()

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const reset = () => {
    requestRef.current += 1
    setFileName('')
    setResult(null)
    setParseError('')
    setReading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const rows = result?.rows ?? []
  const fatalErrors = result?.errors.filter((error) => typeof error.row === 'undefined') ?? []
  const rowErrors = result?.errors.filter((error) => typeof error.row !== 'undefined') ?? []
  const canImport = rows.length > 0

  return (
    <Modal
      open={open}
      title="导入联系人"
      description="从 Excel 批量添加联系人。支持 Atlas 导出文件、标准模板，以及常见的姓名 / 电话 / 邮箱表头。"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!canImport || reading}
            onClick={() => onImport(rows, mode)}
          >
            <Upload size={16} />
            {canImport ? `导入 ${rows.length} 位联系人` : '导入联系人'}
          </button>
        </>
      }
    >
      <div className="import-dialog">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="visually-hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
            event.target.value = ''
          }}
        />

        {!result && !reading && (
          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={openPicker}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openPicker()
              }
            }}
          >
            <span className="dropzone-icon">
              <FileSpreadsheet size={30} />
            </span>
            <h3>拖拽 Excel 文件到这里</h3>
            <p>或点击选择文件 · 支持 .xlsx / .xls，最大 10 MB</p>
            <span className="button button-quiet dropzone-button">
              <Upload size={15} />
              选择文件
            </span>
          </div>
        )}

        {reading && (
          <div className="import-reading" role="status">
            <Loader2 size={24} className="spin" />
            <div>
              <strong>正在读取 {fileName}</strong>
              <p>解析表头与联系人记录，请稍候。</p>
            </div>
          </div>
        )}

        {parseError && (
          <div className="inline-alert inline-alert-error" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>无法导入这个文件</strong>
              <p>{parseError}</p>
            </div>
          </div>
        )}

        {result && (
          <>
            <div className="import-file-summary">
              <span className="import-file-icon">
                <FileSpreadsheet size={21} />
              </span>
              <div className="import-file-copy">
                <strong>{fileName}</strong>
                <small>
                  工作表「{result.sheetName}」· 识别到 <b>{rows.length}</b> 位联系人
                  {existingCount > 0 ? ` · 当前通讯录已有 ${existingCount} 位` : ''}
                </small>
              </div>
              <button type="button" className="button button-small button-quiet" onClick={reset}>
                <RotateCcw size={14} />
                重新选择
              </button>
            </div>

            {fatalErrors.length > 0 && (
              <div className="inline-alert inline-alert-error" role="alert">
                <FileWarning size={18} />
                <div>
                  <strong>文件格式不符合要求</strong>
                  {fatalErrors.map((error) => (
                    <p key={error.message}>{error.message}</p>
                  ))}
                </div>
              </div>
            )}

            {rowErrors.length > 0 && (
              <div className="inline-alert inline-alert-warning" role="status">
                <AlertCircle size={18} />
                <div>
                  <strong>{rowErrors.length} 行未能识别，将被跳过</strong>
                  {rowErrors.slice(0, 3).map((error) => (
                    <p key={`${error.row}-${error.message}`}>{error.message}</p>
                  ))}
                  {rowErrors.length > 3 && <p>还有 {rowErrors.length - 3} 行…</p>}
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <>
                <div className="preview-heading">
                  <div>
                    <h3>数据预览</h3>
                    <p>显示前 5 行，确认列对应关系无误后再导入。</p>
                  </div>
                  <span className="preview-badge">
                    <CheckCircle2 size={14} />
                    {rows.length} 行可导入
                  </span>
                </div>

                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>姓名</th>
                        <th>联系方式</th>
                        <th>收藏</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((row) => (
                        <tr key={`${row.rowNumber}-${row.name}`}>
                          <td>
                            <strong>{row.name}</strong>
                            {(row.company || row.jobTitle) && (
                              <span className="preview-sub">
                                {[row.company, row.jobTitle].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="preview-methods">
                              {row.methods.length === 0 ? (
                                <span className="preview-muted">无</span>
                              ) : (
                                row.methods.slice(0, 3).map((method) => (
                                  <span key={method.id} className="preview-method">
                                    {METHOD_META[method.kind].title} · {method.label}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td>
                            {row.favorite ? (
                              <span className="preview-favorite">
                                <Star size={13} fill="currentColor" />是
                              </span>
                            ) : (
                              <span className="preview-muted">否</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="import-mode-section">
                  <div className="form-section-heading">
                    <div>
                      <h3>重复联系人处理</h3>
                      <p>同名且至少一个联系方式相同时，视为重复。</p>
                    </div>
                  </div>
                  <div className="import-modes">
                    {(
                      [
                        {
                          value: 'merge',
                          title: '智能合并',
                          tag: '推荐',
                          description: '补充新联系方式，并更新公司、职位与备注。',
                        },
                        {
                          value: 'skip',
                          title: '跳过重复',
                          description: '只导入通讯录中不存在的联系人。',
                        },
                        {
                          value: 'append',
                          title: '全部添加',
                          description: '不做去重，保留每一条导入记录。',
                        },
                      ] as { value: ImportMode; title: string; tag?: string; description: string }[]
                    ).map((option) => (
                      <label
                        key={option.value}
                        className={`import-mode ${mode === option.value ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="import-mode"
                          value={option.value}
                          checked={mode === option.value}
                          onChange={() => setMode(option.value)}
                        />
                        <span className="radio-dot" aria-hidden="true" />
                        <span className="import-mode-copy">
                          <span className="import-mode-title">
                            {option.title}
                            {option.tag && <em>{option.tag}</em>}
                          </span>
                          <small>{option.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {result.ignoredHeaders.length > 0 && (
              <p className="import-footnote">
                已忽略无法识别的列：{result.ignoredHeaders.join('、')}
              </p>
            )}
          </>
        )}

        <div className="import-help">
          <div>
            <strong>第一次导入？</strong>
            <p>下载标准模板，按表头填写后上传，字段会自动对应。</p>
          </div>
          <button
            type="button"
            className="button button-small button-ghost"
            onClick={onDownloadTemplate}
          >
            下载 Excel 模板
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
