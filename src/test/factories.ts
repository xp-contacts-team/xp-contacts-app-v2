import type { ContactInput } from '../types'

export function makeContactInput(overrides: Partial<ContactInput> = {}): ContactInput {
  return {
    name: '张三',
    company: '示例科技',
    jobTitle: '产品经理',
    notes: '测试联系人',
    favorite: false,
    methods: [
      { id: 'm-phone', kind: 'phone', label: '手机', value: '138 0000 0000' },
      { id: 'm-email', kind: 'email', label: '工作', value: 'zhangsan@example.com' },
    ],
    ...overrides,
  }
}
