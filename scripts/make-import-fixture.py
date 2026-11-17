from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "fixtures" / "Atlas-import-sample.xlsx"
OUT.parent.mkdir(parents=True, exist_ok=True)

headers = [
    "姓名", "公司", "职位", "收藏", "备注",
    "电话1标签", "电话1号码", "电话2标签", "电话2号码",
    "邮箱1标签", "邮箱1地址", "邮箱2标签", "邮箱2地址",
    "社交1标签", "社交1账号", "社交2标签", "社交2账号",
    "地址1标签", "地址1详细地址", "地址2标签", "地址2详细地址",
]

rows = [
    [
        "顾清", "青禾建筑", "建筑设计师", "是", "老邻居，喜欢逛展。",
        "手机", "135 8899 0011", "工作", "021-6677 8899",
        "工作", "qing.gu@qinghe.design", "个人", "qing@example.com",
        "微信", "guqing_design", "小红书", "青禾设计",
        "公司", "上海市杨浦区国康路 100 号", "", "",
    ],
    [
        "沈舟", "知远律师事务所", "律师", "否", "校友，主攻知识产权。",
        "手机", "136 7788 2211", "", "",
        "工作", "zhou.shen@zhiyuan.law", "", "",
        "LinkedIn", "shen-zhou-law", "", "",
        "公司", "北京市朝阳区建国路 88 号", "", "",
    ],
    [
        "唐宁", "壹页书店", "店主", "是", "独立书店店主，每月有读书会。",
        "手机", "137 6655 8899", "店内", "0571-8899 1122",
        "个人", "ning.tang@example.com", "", "",
        "微信", "yiyebooks", "微博", "壹页书店",
        "门店", "杭州市拱墅区小河路 18 号", "", "",
    ],
]

workbook = Workbook()
sheet = workbook.active
sheet.title = "通讯录"
sheet.append(headers)
for row in rows:
    sheet.append(row)

header_fill = PatternFill("solid", fgColor="4F46E5")
header_font = Font(color="FFFFFF", bold=True)
for cell in sheet[1]:
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center")

widths = [12, 20, 14, 8, 30, 12, 20, 12, 20, 10, 30, 10, 30, 12, 22, 12, 22, 10, 40, 10, 40]
for index, width in enumerate(widths, start=1):
    sheet.column_dimensions[get_column_letter(index)].width = width

sheet.freeze_panes = "A2"
sheet.auto_filter.ref = f"A1:{get_column_letter(len(headers))}{len(rows) + 1}"

guide = workbook.create_sheet("填写说明")
guide["A1"] = "Atlas 通讯录 · 示例导入文件"
guide["A1"].font = Font(bold=True, size=14)
guide["A3"] = "用途"
guide["B3"] = "用于演示导入：包含 3 位联系人，收藏、多电话、多邮箱、社交账号与地址。"
guide["A4"] = "导入方式"
guide["B4"] = "打开 Atlas 通讯录 → 导入 → 选择本文件 → 智能合并 → 导入 3 位联系人。"
guide["A5"] = "注意"
guide["B5"] = "这是虚构示例数据，不包含真实个人信息。"
guide.column_dimensions["A"].width = 14
guide.column_dimensions["B"].width = 90

workbook.save(OUT)
print(OUT)
