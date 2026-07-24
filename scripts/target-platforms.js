/**
 * 定向招标平台配置
 * 用于 sync-targeted-tenders.js 在指定网站范围内搜索招标信息
 */

// 一手平台：轨道交通企业 / 公共资源交易中心自营平台
const FIRST_HAND_PLATFORMS = [
  { domain: 'cg.95306.cn', name: '国铁采购平台', region: '全国', homepage: 'https://cg.95306.cn' },
  { domain: 'crrcgo.cc', name: '中车购2.0平台', region: '全国', homepage: 'https://www.crrcgo.cc' },
  { domain: 'cg.shenzhenmc.com', name: '深圳地铁智能招采管理平台', region: '深圳', homepage: 'https://cg.shenzhenmc.com' },
  { domain: 'eps.shmetro.com', name: '上海地铁采购平台', region: '上海', homepage: 'https://eps.shmetro.com' },
  { domain: 'ggzy.xinjiang.gov.cn', name: '新疆公共资源交易网', region: '新疆', homepage: 'https://ggzy.xinjiang.gov.cn' },
  { domain: 'jxszwsjb.jiaxing.gov.cn', name: '嘉兴市公共资源交易网', region: '嘉兴', homepage: 'https://jxszwsjb.jiaxing.gov.cn' },
  { domain: 'ggzyjy.sc.gov.cn', name: '四川省公共资源交易信息网', region: '四川', homepage: 'https://ggzyjy.sc.gov.cn' },
  { domain: 'ggzyjy.gd.gov.cn', name: '广东省公共资源交易中心', region: '广东', homepage: 'https://ggzyjy.gd.gov.cn' },
  { domain: 'ggzyfw.beijing.gov.cn', name: '北京市公共资源交易中心', region: '北京', homepage: 'https://ggzyfw.beijing.gov.cn' },
  { domain: 'ggzyjy.shandong.gov.cn', name: '青岛市公共资源交易电子服务系统', region: '青岛', homepage: 'https://ggzyjy.shandong.gov.cn' },
  { domain: 'chinabidding.cn', name: '中国招标投标公共服务平台', region: '全国', homepage: 'https://www.chinabidding.cn' },
  { domain: 'cebpubservice.com', name: '中国招标投标公共服务平台', region: '全国', homepage: 'https://www.cebpubservice.com' },
  { domain: 'tjgdjt.com', name: '天津轨道交通集团', region: '天津', homepage: 'http://www.tjgdjt.com' },
  { domain: 'jac.com.cn', name: '安徽江淮汽车集团', region: '安徽', homepage: 'https://www.jac.com.cn' },
];

// 第三方聚合平台，作为补充搜索域
const THIRD_PARTY_PLATFORMS = [
  { domain: 'qianlima.com', name: '千里马招标网', homepage: 'https://www.qianlima.com' },
  { domain: 'dlzb.com', name: '电力招标网', homepage: 'https://www.dlzb.com' },
  { domain: 'coopaa.com', name: '建设招标网', homepage: 'https://www.coopaa.com' },
  { domain: 'zhiliaobiaoxun.cn', name: '知了标讯', homepage: 'https://www.zhiliaobiaoxun.cn' },
  { domain: 'zhaobiao.cn', name: '招标网', homepage: 'https://www.zhaobiao.cn' },
  { domain: 'jianyu360.cn', name: '剑鱼标讯', homepage: 'https://www.jianyu360.cn' },
  { domain: 'jiancezhaobiao.com', name: '检测招标网', homepage: 'https://www.jiancezhaobiao.com' },
  { domain: '86ztbb.com', name: '中拓招标网', homepage: 'https://www.86ztbb.com' },
  { domain: 'szhbuy.com', name: '商智荟招采', homepage: 'https://www.szhbuy.com' },
  { domain: 'bidnews.cn', name: '标讯天下', homepage: 'https://www.bidnews.cn' },
  { domain: 'ccpc360.com', name: '招标采购导航网', homepage: 'https://www.ccpc360.com' },
  { domain: 'anfangzhaobiao.com', name: '安防招标网', homepage: 'https://www.anfangzhaobiao.com' },
];

// 搜索时分组：将平台按域名合并为若干组，避免 include_domains 过长导致结果稀释
// 每组包含 2-5 个相关平台，按“轨道交通”和“地区公共资源”分类
const SEARCH_GROUPS = [
  {
    name: '轨道交通企业',
    domains: ['cg.95306.cn', 'crrcgo.cc', 'cg.shenzhenmc.com', 'eps.shmetro.com', 'tjgdjt.com', 'jac.com.cn'],
  },
  {
    name: '华北公共资源',
    domains: ['ggzyfw.beijing.gov.cn', 'ggzyjy.gd.gov.cn'],
  },
  {
    name: '华东公共资源',
    domains: ['jxszwsjb.jiaxing.gov.cn', 'ggzyjy.shandong.gov.cn'],
  },
  {
    name: '西南西北公共资源',
    domains: ['ggzyjy.sc.gov.cn', 'ggzy.xinjiang.gov.cn'],
  },
  {
    name: '公共服务平台',
    domains: ['chinabidding.cn', 'cebpubservice.com'],
  },
];

module.exports = {
  FIRST_HAND_PLATFORMS,
  THIRD_PARTY_PLATFORMS,
  SEARCH_GROUPS,
  ALL_PLATFORMS: [...FIRST_HAND_PLATFORMS, ...THIRD_PARTY_PLATFORMS],
};
