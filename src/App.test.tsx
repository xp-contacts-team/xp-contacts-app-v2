import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

vi.mock('./lib/api', () => ({
  fetchContacts: vi.fn(async () => []),
  replaceAllContacts: vi.fn(async () => undefined),
}))

function contactCards() {
  return screen.getAllByRole('button', { name: /查看 .* 的联系人详情/ })
}

describe('Atlas address book', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens on the first contact and shows its multiple contact methods', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: '全部联系人' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: '陈思远' })).toBeInTheDocument()
    expect(screen.getAllByText('138 0013 8000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('010-8888 6666').length).toBeGreaterThan(0)
    expect(screen.getByText('siyuan.chen@xinglan.cn')).toBeInTheDocument()
    expect(screen.getByText('siyuan_chen')).toBeInTheDocument()
  })

  it('filters the list to favorites from the sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(contactCards()).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: /我的收藏/ }))

    expect(screen.getByRole('heading', { level: 1, name: '我的收藏' })).toBeInTheDocument()
    expect(contactCards()).toHaveLength(4)
    expect(screen.getByText('林晓雨')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '收藏 王浩然' })).not.toBeInTheDocument()
  })

  it('marks a contact as favorite and makes it available in the favorites view', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '收藏 王浩然' }))
    expect(screen.getByRole('status')).toHaveTextContent('已加入收藏')

    await user.click(screen.getByRole('button', { name: /我的收藏/ }))
    expect(contactCards()).toHaveLength(5)
    expect(screen.getByRole('button', { name: '取消收藏 王浩然' })).toBeInTheDocument()
  })

  it('searches across name, company and contact methods', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('搜索联系人'), '星澜')
    expect(contactCards()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /查看 陈思远/ })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('搜索联系人'))
    await user.type(screen.getByLabelText('搜索联系人'), 'yiming-dev')
    expect(contactCards()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /查看 赵一鸣/ })).toBeInTheDocument()
  })

  it('creates a contact with a multi-value phone list and persists it', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '新建' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('新建联系人')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: /姓名/ }), '测试同学')
    await user.type(within(dialog).getByRole('textbox', { name: '公司' }), '测试公司')
    await user.type(within(dialog).getByRole('textbox', { name: '职位' }), '测试工程师')

    const phoneInputs = within(dialog).getAllByRole('textbox', { name: '电话内容' })
    await user.type(phoneInputs[0], '138 1234 5678')
    await user.click(within(dialog).getByRole('button', { name: /添加电话/ }))
    await user.type(within(dialog).getAllByRole('textbox', { name: '电话内容' })[1], '010-6666 8888')

    await user.click(within(dialog).getByRole('button', { name: '创建联系人' }))

    expect(await screen.findByRole('heading', { level: 2, name: '测试同学' })).toBeInTheDocument()
    expect(screen.getAllByText('138 1234 5678').length).toBeGreaterThan(0)
    expect(screen.getAllByText('010-6666 8888').length).toBeGreaterThan(0)

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      contacts: { name: string; methods: unknown[] }[]
    }
    const created = stored.contacts.find((contact) => contact.name === '测试同学')
    expect(created?.methods).toHaveLength(2)
  })

  it('requires a name before creating a contact', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '新建' }))
    await user.click(screen.getByRole('button', { name: '创建联系人' }))

    expect(screen.getByText('请填写联系人姓名。')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('deletes a contact after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /查看 王浩然/ }))
    await user.click(screen.getByRole('button', { name: '删除 王浩然' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '确认删除' }))

    expect(screen.queryByRole('button', { name: /查看 王浩然/ })).not.toBeInTheDocument()
    expect(contactCards()).toHaveLength(9)
  })
})
