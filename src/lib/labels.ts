import type { ContactMethodKind } from '../types'

export interface MethodMeta {
  title: string
  addLabel: string
  defaultLabel: string
  labelPlaceholder: string
  valuePlaceholder: string
  valueType: 'tel' | 'email' | 'text'
}

export const METHOD_META: Record<ContactMethodKind, MethodMeta> = {
  phone: {
    title: '电话',
    addLabel: '添加电话',
    defaultLabel: '手机',
    labelPlaceholder: '如：手机 / 工作',
    valuePlaceholder: '如：138 0013 8000',
    valueType: 'tel',
  },
  email: {
    title: '邮箱',
    addLabel: '添加邮箱',
    defaultLabel: '个人',
    labelPlaceholder: '如：个人 / 工作',
    valuePlaceholder: '如：name@example.com',
    valueType: 'email',
  },
  social: {
    title: '社交账号',
    addLabel: '添加社交账号',
    defaultLabel: '微信',
    labelPlaceholder: '如：微信 / 微博 / LinkedIn',
    valuePlaceholder: '如：wechat_id',
    valueType: 'text',
  },
  address: {
    title: '地址',
    addLabel: '添加地址',
    defaultLabel: '家庭',
    labelPlaceholder: '如：家庭 / 公司',
    valuePlaceholder: '如：北京市海淀区中关村大街 27 号',
    valueType: 'text',
  },
}

export const SORT_OPTIONS: { value: 'name' | 'updated' | 'company'; label: string }[] = [
  { value: 'name', label: '姓名 A–Z' },
  { value: 'updated', label: '最近更新' },
  { value: 'company', label: '按公司' },
]
