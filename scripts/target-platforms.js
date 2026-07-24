/**
 * 定向招标平台配置
 * 用于 sync-targeted-tenders.js 在指定网站范围内搜索招标信息
 * 数据来源：公司网站信息.xls + 项目原有白名单
 * 生成时间：2026-07-24
 */

// 一手平台：轨道交通企业 / 公共资源交易中心 / 央企国企自营采购平台
const FIRST_HAND_PLATFORMS = [
  // 中车系
  { domain: 'ec.crrcgc.cc', name: '中国中车供应链管理电子平台', homepage: 'http://ec.crrcgc.cc' },
  { domain: 'cg.csrgc.com.cn', name: '中国中车采购电子商务平台', homepage: 'http://cg.csrgc.com.cn' },
  { domain: 'esign.crrcpz.cc', name: '中车南京浦镇车辆有限公司', homepage: 'https://esign.crrcpz.cc:8562/api/lk/HCQUEz' },
  { domain: 'srm.dloco.com', name: '中车大连机车车辆有限公司', homepage: 'https://srm.dloco.com/seeyon/index.jsp' },
  { domain: '60.216.3.68', name: '中车山东机车车辆有限公司', homepage: 'https://60.216.3.68:5777' },
  { domain: 'zjportal.crrcgc.cc', name: '中车株洲电力机车有限公司', homepage: 'https://zjportal.crrcgc.cc:8888/ierp/login.html' },
  { domain: 'crrcgo.cc', name: '中车购2.0平台', homepage: 'https://www.crrcgo.cc', region: '全国' },

  // 公共资源交易中心
  { domain: 'ggzy.jgswj.gxzf.gov.cn', name: '全国公共资源交易平台（广西南宁）', homepage: 'http://ggzy.jgswj.gxzf.gov.cn/nnggzy/' },
  { domain: 'ggzyfw.beijing.gov.cn', name: '北京市公共资源交易中心', homepage: 'https://ggzyfw.beijing.gov.cn', region: '北京' },
  { domain: 'jxszwsjb.jiaxing.gov.cn', name: '嘉兴市公共资源交易网', homepage: 'https://jxszwsjb.jiaxing.gov.cn', region: '嘉兴' },
  { domain: 'ggzyjy.sc.gov.cn', name: '四川省公共资源交易信息网', homepage: 'https://ggzyjy.sc.gov.cn', region: '四川' },
  { domain: 'ccgp.dl.gov.cn', name: '大连市政府采购网', homepage: 'http://ccgp.dl.gov.cn/dlweb/' },
  { domain: 'jyzt.sxzwfw.gov.cn', name: '山西公共资源交易市场主体库', homepage: 'http://jyzt.sxzwfw.gov.cn/' },
  { domain: 'prec.sxzwfw.gov.cn', name: '山西公共资源数字交易中心', homepage: 'http://prec.sxzwfw.gov.cn/' },
  { domain: 'ggzyjy.gd.gov.cn', name: '广东省公共资源交易中心', homepage: 'https://ggzyjy.gd.gov.cn', region: '广东' },
  { domain: 'www.gzggzy.cn', name: '广州公共资源交易中心', homepage: 'http://www.gzggzy.cn/html/index.html' },
  { domain: 'ggzy.xinjiang.gov.cn', name: '新疆公共资源交易网', homepage: 'https://ggzy.xinjiang.gov.cn', region: '新疆' },
  { domain: 'hnztbkhd.fgw.henan.gov.cn', name: '河南省电子招标投标公共服务平台', homepage: 'http://hnztbkhd.fgw.henan.gov.cn/' },
  { domain: 'www.sxggzyjy.cn', name: '陕西省公共资源交易中心', homepage: 'http://www.sxggzyjy.cn/' },
  { domain: 'ggzyjy.shandong.gov.cn', name: '青岛市公共资源交易电子服务系统', homepage: 'https://ggzyjy.shandong.gov.cn', region: '青岛' },
  { domain: '1.58.199.11', name: '黑龙江公共资源交易网', homepage: 'http://1.58.199.11:8605' },

  // 其他
  { domain: 'thzb.crsc.cn', name: '中国通号招标采购网', homepage: 'http://thzb.crsc.cn/2406.html' },
  { domain: 'xj.86ztbb.com', name: '新疆全流程电子招标交易平台', homepage: 'https://xj.86ztbb.com' },

  // 国铁/铁路局
  { domain: '61.178.243.183', name: '中国铁路兰州局物资采购平台', homepage: 'http://61.178.243.183:8001/tbzlbs/page/gys_register/gys_login.jsp' },
  { domain: 'www.sytljwzzb.com', name: '中国铁路沈阳局集团有限公司', homepage: 'https://www.sytljwzzb.com' },
  { domain: 'cg.95306.cn', name: '国铁采购平台', homepage: 'https://cg.95306.cn', region: '全国' },
  { domain: 'www.gtwzzb.com', name: '成都西南铁路物资有限公司', homepage: 'https://www.gtwzzb.com/' },
  { domain: 'www.ktwzb.com', name: '昆明铁路局物资采购平台', homepage: 'http://www.ktwzb.com/index.jsp' },
  { domain: 'www.xtcgpt.com', name: '西安铁路局物资采购平台', homepage: 'http://www.xtcgpt.com' },

  // 地铁/城轨
  { domain: 'eps.shmetro.com', name: '上海地铁采购平台', homepage: 'https://eps.shmetro.com', region: '上海' },
  { domain: 'www.bjmetro.com.cn', name: '北京地铁电子商务采购平台', homepage: 'http://www.bjmetro.com.cn/ecp/rfq' },
  { domain: '221.178.203.162', name: '南京地铁中央采购平台', homepage: 'http://221.178.203.162:8889/' },
  { domain: 'www.mtrmart.com', name: '城轨采购网', homepage: 'https://www.mtrmart.com/' },
  { domain: 'www.whrtyycg.com', name: '武汉地铁运营采购网', homepage: 'http://www.whrtyycg.com/' },
  { domain: 'www.wuhanrt.com', name: '武汉地铁集团', homepage: 'http://www.wuhanrt.com/public_forward.aspx' },
  { domain: 'cg.shenzhenmc.com', name: '深圳地铁智能招采管理平台', homepage: 'https://cg.shenzhenmc.com', region: '深圳' },
  { domain: 'zzcg.sz-mtr.com', name: '苏州轨道交通集团', homepage: 'http://zzcg.sz-mtr.com/' },
  { domain: 'zzdt.going-link.com', name: '郑州地铁集团', homepage: 'https://zzdt.going-link.com/oauth/' },

  // 央企/国企采购平台
  { domain: 'www.crecgec.com', name: '中国中铁采购电子商务平台', homepage: 'http://www.crecgec.com' },
  { domain: 'ec.ccccltd.cn', name: '中国交建电子采购平台', homepage: 'http://ec.ccccltd.cn/PMS/yhm1.shtml?id=0RQ5UTVHRsHlQXRsTvZSzilopmvdDStC9+34nGhR1Epy0g4Wwm5zAfIwoLN7xyxP' },
  { domain: 'chinabidding.cn', name: '中国招标投标公共服务平台', homepage: 'https://www.chinabidding.cn', region: '全国' },
  { domain: 'cebpubservice.com', name: '中国招标投标公共服务平台', homepage: 'https://www.cebpubservice.com', region: '全国' },
  { domain: 'ebidding.aecc-mall.com', name: '中国航空发动机集团电子招标平台', homepage: 'http://ebidding.aecc-mall.com/index.html' },
  { domain: 'www.chinabidding.cn', name: '中国采购与招标网', homepage: 'https://www.chinabidding.cn/' },
  { domain: 'www.bidding-crmsc.com.cn', name: '中国铁物电子招投标平台', homepage: 'https://www.bidding-crmsc.com.cn/' },
  { domain: 'lec.zdwlcloud.com', name: '中鼎物流智慧云平台', homepage: 'https://lec.zdwlcloud.com/uc/app/portal/main.html' },
  { domain: 'beps.lysteel.com', name: '华菱涟钢供应商自助管理系统', homepage: 'http://beps.lysteel.com:8000/beps/login.jsp' },
  { domain: 'www.shenhuabidding.com.cn', name: '国家能源招标网', homepage: 'http://www.shenhuabidding.com.cn/bidweb/' },
  { domain: 'www.neep.shop', name: '国能e购', homepage: 'http://www.neep.shop' },
  { domain: 'tjgdjt.com', name: '天津轨道交通集团', homepage: 'http://www.tjgdjt.com', region: '天津' },
  { domain: 'jac.com.cn', name: '安徽江淮汽车集团', homepage: 'https://www.jac.com.cn', region: '安徽' },
  { domain: 'dzzb.ciesco.com.cn', name: '招商局集团电子招标采购交易平台', homepage: 'https://dzzb.ciesco.com.cn/' },
  { domain: 'www.hhnycg.com', name: '淮河能源采购平台', homepage: 'http://www.hhnycg.com/index.html#/login' },
];

// 第三方聚合/代理平台，作为补充搜索域
const THIRD_PARTY_PLATFORMS = [
  { domain: 'www.ejy365.com', name: 'E交易平台', homepage: 'https://www.ejy365.com/' },
  { domain: 'www.baohuabidding.com', name: '上海宝华国际招标有限公司', homepage: 'https://www.baohuabidding.com/' },
  { domain: 'home.ebnew.com', name: '中国国际招标网', homepage: 'http://home.ebnew.com/' },
  { domain: 'www.dlzb.com', name: '中国电力招标网', homepage: 'https://www.dlzb.com/member/kefu.php?action=grade.php' },
  { domain: 'www.chinabiddingnet.com', name: '中国采招网', homepage: 'http://www.chinabiddingnet.com/user.php' },
  { domain: '86ztbb.com', name: '中拓招标网', homepage: 'https://www.86ztbb.com' },
  { domain: 'www.365trade.com.cn', name: '中招联合电子招标平台', homepage: 'http://www.365trade.com.cn/' },
  { domain: 'jianyu360.cn', name: '剑鱼标讯', homepage: 'https://www.jianyu360.cn' },
  { domain: 'qianlima.com', name: '千里马招标网', homepage: 'https://www.qianlima.com' },
  { domain: 'szhbuy.com', name: '商智荟招采', homepage: 'https://www.szhbuy.com' },
  { domain: 'www.ebidding.com', name: '国义招标', homepage: 'http://www.ebidding.com/portal/' },
  { domain: 'anfangzhaobiao.com', name: '安防招标网', homepage: 'https://www.anfangzhaobiao.com' },
  { domain: 'www.gdebidding.com', name: '广东电子招标网', homepage: 'http://www.gdebidding.com' },
  { domain: 'www.gxzbtb.cn', name: '广西南宁物资交易平台', homepage: 'http://www.gxzbtb.cn/gxhy' },
  { domain: 'coopaa.com', name: '建设招标网', homepage: 'https://www.coopaa.com' },
  { domain: 'zhaobiao.cn', name: '招标网', homepage: 'https://www.zhaobiao.cn' },
  { domain: 'ccpc360.com', name: '招标采购导航网', homepage: 'https://www.ccpc360.com' },
  { domain: 'www.sxyjcg.com', name: '易交在线电子招标投标交易平台', homepage: 'http://www.sxyjcg.com/' },
  { domain: 'bidnews.cn', name: '标讯天下', homepage: 'https://www.bidnews.cn' },
  { domain: 'jiancezhaobiao.com', name: '检测招标网', homepage: 'https://www.jiancezhaobiao.com' },
  { domain: 'www.hnjdgj.com', name: '河南省机电设备国际招标有限公司', homepage: 'http://www.hnjdgj.com/' },
  { domain: 'new.sztc.com', name: '深圳市国际招标有限公司', homepage: 'http://new.sztc.com/' },
  { domain: 'dlzb.com', name: '电力招标网', homepage: 'https://www.dlzb.com' },
  { domain: 'zhiliaobiaoxun.cn', name: '知了标讯', homepage: 'https://www.zhiliaobiaoxun.cn' },
  { domain: 'www.bidcenter.com.cn', name: '采招网', homepage: 'https://www.bidcenter.com.cn/newsyezhu-179.html' },
];

// 搜索时分组：将平台按域名合并为若干组，避免 include_domains 过长导致结果稀释
// 每组包含相关平台，按类别搜索
const SEARCH_GROUPS = [
  {
    name: '轨道交通企业',
    domains: [
      'cg.95306.cn',
      'www.xtcgpt.com',
      'www.ktwzb.com',
      'www.sytljwzzb.com',
      'www.gtwzzb.com',
      '61.178.243.183',
      'crrcgo.cc',
      'www.crrcgo.cc',
      'cg.csrgc.com.cn',
      'ec.crrcgc.cc',
      'zjportal.crrcgc.cc',
      '60.216.3.68',
      'srm.dloco.com',
      'esign.crrcpz.cc',
      'cg.shenzhenmc.com',
      'eps.shmetro.com',
      'www.bjmetro.com.cn',
      'www.wuhanrt.com',
      'www.whrtyycg.com',
      'zzcg.sz-mtr.com',
      'www.mtrmart.com',
      'zzdt.going-link.com',
      '221.178.203.162',
    ],
  },
  {
    name: '公共资源交易中心',
    domains: [
      'ggzy.xinjiang.gov.cn',
      'jxszwsjb.jiaxing.gov.cn',
      'ggzyjy.sc.gov.cn',
      'ggzyjy.gd.gov.cn',
      'ggzyfw.beijing.gov.cn',
      'ggzyjy.shandong.gov.cn',
      'www.sxggzyjy.cn',
      '1.58.199.11',
      'ggzy.jgswj.gxzf.gov.cn',
      'www.gzggzy.cn',
      'ccgp.dl.gov.cn',
      'jyzt.sxzwfw.gov.cn',
      'prec.sxzwfw.gov.cn',
      'hnztbkhd.fgw.henan.gov.cn',
    ],
  },
  {
    name: '央企国企采购平台',
    domains: [
      'chinabidding.cn',
      'cebpubservice.com',
      'tjgdjt.com',
      'jac.com.cn',
      'lec.zdwlcloud.com',
      'www.bidding-crmsc.com.cn',
      'ebidding.aecc-mall.com',
      'ec.ccccltd.cn',
      'beps.lysteel.com',
      'www.hhnycg.com',
      'www.shenhuabidding.com.cn',
      'www.neep.shop',
      'www.crecgec.com',
      'dzzb.ciesco.com.cn',
    ],
  },
  {
    name: '第三方招标信息平台',
    domains: [
      'www.ejy365.com',
      'www.baohuabidding.com',
      'home.ebnew.com',
      'www.dlzb.com',
      'www.chinabiddingnet.com',
      '86ztbb.com',
      'www.365trade.com.cn',
      'jianyu360.cn',
      'qianlima.com',
      'szhbuy.com',
      'www.ebidding.com',
      'anfangzhaobiao.com',
      'www.gdebidding.com',
      'www.gxzbtb.cn',
      'coopaa.com',
    ],
  },
];

module.exports = {
  FIRST_HAND_PLATFORMS,
  THIRD_PARTY_PLATFORMS,
  SEARCH_GROUPS,
  ALL_PLATFORMS: [...FIRST_HAND_PLATFORMS, ...THIRD_PARTY_PLATFORMS],
};