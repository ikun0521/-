import json, re
from datetime import datetime

html_path = r'C:\Users\ms\Desktop\招标信息库\index.html'
backup_path = r'C:\Users\ms\Desktop\招标信息库\index_backup.html'

with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Backup
with open(backup_path, 'w', encoding='utf-8') as f:
    f.write(html)

tenders = [
    {'id': 1, 'name': '西安动车段综合制动试验台升级改造', 'unit': '中国铁路西安局集团有限公司', 'category': '试验台', 'publish': '2026-07-01', 'deadline': '2026-07-24 09:00', 'link': 'https://www.zhiliaobiaoxun.cn/detail/597976027b1FB76CDAAc.html', 'platform': '国铁采购平台', 'priority': '高'},
    {'id': 2, 'name': '上海局电动落轮机维保（移车台+电动落轮机）', 'unit': '中国铁路上海局集团有限公司上海大型养路机械运用检修段', 'category': '落轮机', 'publish': '2026-07-15', 'deadline': '2026-07-29', 'link': 'https://www.zhiliaobiaoxun.cn/detail/598902189b17CA73835c.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 3, 'name': '上海局电动架车机维保', 'unit': '中国铁路上海局集团有限公司上海大型养路机械运用检修段', 'category': '架车机', 'publish': '2026-07-08', 'deadline': '2026-07-29', 'link': 'https://www.zhiliaobiaoxun.cn/detail/598358609b199DA3AE4c.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 4, 'name': '上海动车段调试车间移动式架车机大修', 'unit': '中国铁路上海局集团有限公司上海动车段', 'category': '架车机', 'publish': '2026-07-09', 'deadline': '2026-07-29 09:00', 'link': 'http://www.gdtzb.com/g-zb-46568018.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 5, 'name': '上海动车段转向架车间轴承压装机大修', 'unit': '中国铁路上海局集团有限公司上海动车段', 'category': '轴承压装机', 'publish': '2026-07-09', 'deadline': '2026-07-29 10:30', 'link': 'http://www.gdtzb.com/g-zb-46567990.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 6, 'name': '郑州机务段司机控制器试验台采购', 'unit': '中国铁路郑州局集团有限公司郑州机务段', 'category': '试验台', 'publish': '2026-07-06', 'deadline': '2026-07-29 09:00', 'link': 'https://www.zhiliaobiaoxun.cn/detail/598224474b1E0D4E613c.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 7, 'name': '西安客车车辆段微控单车试验器购置', 'unit': '中国铁路西安局集团有限公司西安客车车辆段', 'category': '试验台', 'publish': '2026-07-04', 'deadline': '2026-07-27 14:30', 'link': 'https://www.zhiliaobiaoxun.cn/detail/597977939b1B8B2003Fc.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 8, 'name': '中车大连HXD3系列电力机车电传动系统测试试验台', 'unit': '中车大连机车研究所有限公司', 'category': '试验台', 'publish': '2026-07-16', 'deadline': '2026-08-11 09:00', 'link': 'https://www.365trade.com.cn/zhwzb/845652.jhtml', 'platform': '中车购2.0平台', 'priority': '中'},
    {'id': 9, 'name': '济南四方所动车试验台升级改造（油压减振器试验台）', 'unit': '济南中车四方所智能装备科技有限公司', 'category': '试验台', 'publish': '2026-07-12', 'deadline': '2026-07-30', 'link': 'http://www.bbda.com/bidDetail/78702a02e90be547d72de644ba58825c9ad1bed56f5c5ef841f4072ab8877b9a.html', 'platform': '中车购2.0平台', 'priority': '中'},
    {'id': 10, 'name': '北京局CIR设备实时故障诊断设备', 'unit': '中国铁路北京局集团有限公司', 'category': '传感器试验台', 'publish': '2026-07-22', 'deadline': '2026-08-11 09:30', 'link': 'https://www.zbytb.com/s-zb-68143540.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 11, 'name': '上海机辆段轴承自动测量机公开招标（二次）', 'unit': '中国铁路上海局集团有限公司', 'category': '轴承', 'publish': '2026-07-09', 'deadline': '2026-07-31 08:30', 'link': 'https://www.zhiliaobiaoxun.cn/detail/598304704b1F943B1A6c.html', 'platform': '国铁采购平台', 'priority': '中'},
    {'id': 12, 'name': '中车浦镇海泰制动自动化测试技术服务', 'unit': '南京中车浦镇海泰制动设备有限公司', 'category': '试验台', 'publish': '2026-07-09', 'deadline': '2026-07-30 09:30', 'link': 'http://www.gdtzb.com/g-zb-46508840.html', 'platform': '中车购2.0平台', 'priority': '中'},
    {'id': 13, 'name': '江淮汽车G2615项目减震器性能试验台', 'unit': '安徽江淮汽车集团股份有限公司', 'category': '试验台', 'publish': '2026-07-14', 'deadline': '合同签订后4个月', 'link': 'https://www.jac.com.cn/u/cms/www/proclama/202607/G2615项目减震器性能试验台公开招标公告_8.pdf', 'platform': '安徽江淮汽车集团', 'priority': '低'},
    {'id': 14, 'name': '北京市郊铁路东北环线工程第四批建管甲供物资（车辆基地设备）', 'unit': '中国铁路北京局集团有限公司京南工程项目管理部', 'category': '转向架', 'publish': '2026-07-10', 'deadline': '待确认', 'link': 'https://ggzyfw.beijing.gov.cn/jylcgcjs/20260710/5619872.html', 'platform': '北京市公共资源交易中心', 'priority': '低'},
    {'id': 15, 'name': '苏州轨道交通浒墅关电客车架大修基地扩能改造设备采购', 'unit': '苏州轨道交通运营有限公司', 'category': '试验台', 'publish': '2026-05-14', 'deadline': '2027-04-30', 'link': 'https://zzcg.sz-mtr.com/cgxx/002002/002002001/20260514/f694da76-c0d4-4eba-9b35-7e7df32e27e6.html', 'platform': '苏州轨道交通集团', 'priority': '低'},
    {'id': 16, 'name': '中车制动城轨北京地铁14号线钩缓装置大修', 'unit': '中车制动系统有限公司', 'category': '钩缓拆装机', 'publish': '2026-07-09', 'deadline': '待确认', 'link': 'https://www.biao800.cn/detail/20260709-209210145.html', 'platform': '中车购2.0平台', 'priority': '低'},
]

# Sort priority then publish date
prio_order = {'高': 0, '中': 1, '低': 2}
tenders.sort(key=lambda t: (prio_order.get(t['priority'], 9), t['publish']))

# Format as JS array
field_order = ['id', 'name', 'unit', 'category', 'publish', 'deadline', 'link', 'platform', 'priority']
tender_lines = []
for i, t in enumerate(tenders):
    tender_lines.append('            {')
    for j, key in enumerate(field_order):
        comma = ',' if j < len(field_order) - 1 else ''
        tender_lines.append(f'                "{key}": {json.dumps(t[key], ensure_ascii=False)}{comma}')
    comma = ',' if i < len(tenders) - 1 else ''
    tender_lines.append('            }' + comma)

tender_array = '\n'.join(tender_lines)

# Replace empty array
new_html = re.sub(
    r'let tenders = \[\];',
    f'let tenders = [\n{tender_array}\n        ];',
    html
)

# Update count
new_html = re.sub(
    r'(<span id="totalCount"[^>]*>)[^<]*(</span>)',
    lambda m: m.group(1) + str(len(tenders)) + m.group(2),
    new_html
)

# Update timestamp
now = datetime.now()
time_str = now.strftime('%Y-%m-%d %H:%M')
new_html = re.sub(
    r'(<span class="text-sm text-slate-500">最近更新：)[^<]*(</span>)',
    lambda m: m.group(1) + time_str + m.group(2),
    new_html
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f'OK: {len(tenders)} tenders written, backup saved')
