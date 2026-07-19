export interface CrawlerResult {
  platform: string;
  query: string;
  crawledAt: string;
  data: any;
}

export interface XiaohongshuPost {
  title: string;
  likes: number;
  comments: number;
  shares: number;
  images: string[];
  tags: string[];
  author: string;
  content: string;
}

export interface TaobaoProduct {
  name: string;
  sales: number;
  growthRate: string;
  price: string;
  image: string;
  shopName: string;
}

export interface DouyinVideo {
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  cover: string;
}

const MOCK_XHS_DATA: XiaohongshuPost[] = [
  {
    title: "职场通勤穿搭指南｜高级感穿搭公式",
    likes: 12580,
    comments: 892,
    shares: 2341,
    images: [],
    tags: ["职场穿搭", "通勤穿搭", "高级感"],
    author: "时尚博主小美",
    content: "分享一套适合职场的通勤穿搭，简约而不简单，高级感满满",
  },
  {
    title: "极简风yyds｜秋冬必备单品",
    likes: 9876,
    comments: 654,
    shares: 1892,
    images: [],
    tags: ["极简风", "秋冬穿搭", "必备单品"],
    author: "穿搭日记",
    content: "极简主义回归，简约线条、中性色调成为主流",
  },
  {
    title: "秋冬高级感穿搭｜氛围感拉满",
    likes: 15620,
    comments: 1234,
    shares: 3456,
    images: [],
    tags: ["高级感", "氛围感", "秋冬穿搭"],
    author: "时尚研究所",
    content: "秋冬季节如何穿出高级感，氛围感穿搭技巧分享",
  },
  {
    title: "可持续时尚｜环保材料穿搭",
    likes: 8340,
    comments: 456,
    shares: 1234,
    images: [],
    tags: ["可持续时尚", "环保穿搭", "绿色时尚"],
    author: "环保时尚",
    content: "环保材料、二手服装关注度上升，可持续时尚成为趋势",
  },
  {
    title: "新中式风格｜传统与现代的完美结合",
    likes: 11230,
    comments: 789,
    shares: 2109,
    images: [],
    tags: ["新中式", "国潮", "传统元素"],
    author: "国风时尚",
    content: "传统元素与现代设计结合，新中式风格越来越受欢迎",
  },
];

const MOCK_TB_DATA: TaobaoProduct[] = [
  { name: "极简羊毛大衣女秋冬新款", sales: 15600, growthRate: "+125%", price: "¥599-899", image: "", shopName: "TEPNIX旗舰店" },
  { name: "高腰直筒牛仔裤显瘦", sales: 28900, growthRate: "+89%", price: "¥199-299", image: "", shopName: "潮流服饰" },
  { name: "真丝衬衫女气质通勤", sales: 12300, growthRate: "+76%", price: "¥299-499", image: "", shopName: "优雅女装" },
  { name: "针织开衫外套宽松", sales: 18700, growthRate: "+67%", price: "¥159-259", image: "", shopName: "针织世家" },
  { name: "羽绒服女短款时尚", sales: 22400, growthRate: "+156%", price: "¥399-699", image: "", shopName: "羽绒专家" },
];

const MOCK_DY_DATA: DouyinVideo[] = [
  { title: "30秒职场穿搭技巧｜秒变职场精英", views: 568000, likes: 45600, comments: 3200, shares: 18000, cover: "" },
  { title: "秋冬必备单品｜这5件一定要买", views: 892000, likes: 78900, comments: 5600, shares: 32000, cover: "" },
  { title: "平价替代奢侈品｜性价比超高", views: 1230000, likes: 112000, comments: 8900, shares: 45000, cover: "" },
  { title: "新中式穿搭｜国潮来袭", views: 786000, likes: 65400, comments: 4300, shares: 28000, cover: "" },
];

const TREND_KEYWORDS = [
  "极简穿搭", "职场穿搭", "高级感", "氛围感", "通勤装",
  "可持续时尚", "新中式", "国潮", "秋冬穿搭", "显瘦穿搭",
];

const MARKET_TRENDS = [
  { trend: "极简主义回归", confidence: 92, description: "简约线条、中性色调成为主流" },
  { trend: "可持续时尚", confidence: 88, description: "环保材料、二手服装关注度上升" },
  { trend: "新中式风格", confidence: 85, description: "传统元素与现代设计结合" },
  { trend: "氛围感穿搭", confidence: 89, description: "通过搭配营造特定氛围和情绪" },
  { trend: "轻职场风格", confidence: 87, description: "正式与休闲的平衡，舒适又得体" },
];

export async function crawlXiaohongshu(query: string): Promise<CrawlerResult> {
  try {
    const result: CrawlerResult = {
      platform: "xiaohongshu",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        trendingKeywords: TREND_KEYWORDS.filter(k => k.includes(query) || query.includes(k)).slice(0, 5),
        hotPosts: MOCK_XHS_DATA.filter(p => 
          p.title.includes(query) || p.tags.some(t => t.includes(query))
        ).slice(0, 5),
        trends: MARKET_TRENDS,
      },
    };
    return result;
  } catch (error) {
    console.error("Xiaohongshu crawl error:", error);
    return {
      platform: "xiaohongshu",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        trendingKeywords: TREND_KEYWORDS.slice(0, 5),
        hotPosts: MOCK_XHS_DATA.slice(0, 3),
        trends: MARKET_TRENDS.slice(0, 3),
      },
    };
  }
}

export async function crawlTaobao(query: string): Promise<CrawlerResult> {
  try {
    const result: CrawlerResult = {
      platform: "taobao",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        hotProducts: MOCK_TB_DATA.filter(p => 
          p.name.includes(query) || query.includes("外套") || query.includes("上衣")
        ).slice(0, 5),
        categoryAnalysis: {
          tops: { ratio: 35, growth: "+23%" },
          bottoms: { ratio: 28, growth: "+18%" },
          outerwear: { ratio: 22, growth: "+35%" },
          accessories: { ratio: 15, growth: "+42%" },
        },
      },
    };
    return result;
  } catch (error) {
    console.error("Taobao crawl error:", error);
    return {
      platform: "taobao",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        hotProducts: MOCK_TB_DATA.slice(0, 3),
        categoryAnalysis: {
          tops: { ratio: 35, growth: "+23%" },
          bottoms: { ratio: 28, growth: "+18%" },
          outerwear: { ratio: 22, growth: "+35%" },
          accessories: { ratio: 15, growth: "+42%" },
        },
      },
    };
  }
}

export async function crawlDouyin(query: string): Promise<CrawlerResult> {
  try {
    const result: CrawlerResult = {
      platform: "douyin",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        viralVideos: MOCK_DY_DATA.filter(v => 
          v.title.includes(query) || query.includes("穿搭")
        ).slice(0, 5),
        trendingTopics: ["#职场穿搭", "#秋冬穿搭", "#极简风", "#平价时尚", "#新中式"],
      },
    };
    return result;
  } catch (error) {
    console.error("Douyin crawl error:", error);
    return {
      platform: "douyin",
      query,
      crawledAt: new Date().toISOString(),
      data: {
        viralVideos: MOCK_DY_DATA.slice(0, 3),
        trendingTopics: ["#职场穿搭", "#秋冬穿搭", "#极简风"],
      },
    };
  }
}

export async function crawlAllPlatforms(query: string): Promise<CrawlerResult[]> {
  const [xhs, tb, dy] = await Promise.all([
    crawlXiaohongshu(query),
    crawlTaobao(query),
    crawlDouyin(query),
  ]);
  return [xhs, tb, dy];
}

export interface FabricSupplier {
  name: string;
  location: string;
  specialties: string[];
  quality: string;
  minOrder: number;
  priceLevel: string;
  contact?: string;
  website?: string;
  certifications?: string[];
}

export interface FabricDetail {
  name: string;
  composition: string;
  weight: string;
  width: string;
  price: string;
  supplier: string;
  characteristics: string[];
  usage: string[];
}

const FABRIC_SUPPLIERS: FabricSupplier[] = [
  { name: "恒源祥集团", location: "上海", specialties: ["羊毛", "羊绒", "毛混纺"], quality: "优", minOrder: 100, priceLevel: "中高", certifications: ["ISO9001", "OEKO-TEX"] },
  { name: "鲁泰纺织", location: "山东淄博", specialties: ["纯棉", "棉涤", "高档衬衫面料"], quality: "优", minOrder: 500, priceLevel: "中", certifications: ["ISO9001", "ISO14001"] },
  { name: "吴江盛泽纺织城", location: "江苏吴江", specialties: ["涤纶", "锦纶", "功能性面料", "家纺面料"], quality: "良", minOrder: 1000, priceLevel: "低中" },
  { name: "杭州丝绸集团", location: "浙江杭州", specialties: ["真丝", "丝绸", "丝棉混纺"], quality: "优", minOrder: 200, priceLevel: "高", certifications: ["ISO9001"] },
  { name: "广东联发纺织", location: "广东佛山", specialties: ["针织面料", "功能性面料", "运动面料"], quality: "良", minOrder: 500, priceLevel: "中" },
  { name: "江苏阳光集团", location: "江苏江阴", specialties: ["毛纺", "呢料", "高档西服面料"], quality: "优", minOrder: 300, priceLevel: "中高", certifications: ["ISO9001", "ISO14001"] },
  { name: "福建凤竹纺织", location: "福建晋江", specialties: ["针织面料", "牛仔布", "休闲面料"], quality: "良", minOrder: 800, priceLevel: "中" },
  { name: "山东如意集团", location: "山东济宁", specialties: ["精纺面料", "高档面料", "羊绒面料"], quality: "优", minOrder: 200, priceLevel: "高", certifications: ["ISO9001"] },
  { name: "宁波申洲针织", location: "浙江宁波", specialties: ["针织面料", "运动面料", "功能性面料"], quality: "优", minOrder: 1000, priceLevel: "中高", certifications: ["ISO9001", "OEKO-TEX"] },
  { name: "河北宁纺集团", location: "河北邢台", specialties: ["棉麻", "亚麻", "天然面料"], quality: "良", minOrder: 600, priceLevel: "中" },
];

const FABRIC_DETAILS: Record<string, FabricDetail> = {
  "棉": { name: "纯棉面料", composition: "100%棉", weight: "100-200g/m²", width: "150cm", price: "¥20-40/米", supplier: "鲁泰纺织", characteristics: ["透气吸汗", "舒适亲肤", "天然环保"], usage: ["T恤", "衬衫", "连衣裙"] },
  "麻": { name: "亚麻面料", composition: "100%亚麻", weight: "120-180g/m²", width: "145cm", price: "¥30-60/米", supplier: "河北宁纺集团", characteristics: ["透气凉爽", "天然质感", "抗皱性差"], usage: ["衬衫", "连衣裙", "休闲裤"] },
  "丝": { name: "真丝面料", composition: "100%桑蚕丝", weight: "80-150g/m²", width: "140cm", price: "¥80-200/米", supplier: "杭州丝绸集团", characteristics: ["光泽柔和", "手感顺滑", "亲肤舒适"], usage: ["连衣裙", "衬衫", "丝巾"] },
  "羊毛": { name: "羊毛面料", composition: "100%羊毛", weight: "250-400g/m²", width: "150cm", price: "¥60-150/米", supplier: "恒源祥集团", characteristics: ["保暖性好", "柔软舒适", "质感高级"], usage: ["外套", "毛衣", "西装"] },
  "羊绒": { name: "羊绒面料", composition: "100%羊绒", weight: "200-350g/m²", width: "140cm", price: "¥150-400/米", supplier: "恒源祥集团", characteristics: ["轻盈保暖", "柔软细腻", "高档奢华"], usage: ["毛衣", "围巾", "大衣"] },
  "涤纶": { name: "涤纶面料", composition: "100%涤纶", weight: "100-250g/m²", width: "150cm", price: "¥10-30/米", supplier: "吴江盛泽纺织城", characteristics: ["耐磨耐穿", "易打理", "功能性强"], usage: ["运动服", "外套", "箱包"] },
  "锦纶": { name: "锦纶面料", composition: "100%锦纶", weight: "80-180g/m²", width: "150cm", price: "¥15-40/米", supplier: "吴江盛泽纺织城", characteristics: ["强度高", "弹性好", "耐磨"], usage: ["运动服", "泳衣", "羽绒服"] },
  "氨纶": { name: "氨纶面料", composition: "氨纶混纺", weight: "150-300g/m²", width: "150cm", price: "¥20-50/米", supplier: "广东联发纺织", characteristics: ["弹性极佳", "贴身舒适", "回复性好"], usage: ["运动服", "内衣", "紧身衣"] },
  "棉涤": { name: "棉涤混纺", composition: "棉65%/涤35%", weight: "120-200g/m²", width: "150cm", price: "¥15-35/米", supplier: "鲁泰纺织", characteristics: ["兼具棉的舒适和涤纶的耐用", "易打理", "性价比高"], usage: ["衬衫", "裤子", "外套"] },
  "毛涤": { name: "毛涤混纺", composition: "毛50%/涤50%", weight: "250-350g/m²", width: "150cm", price: "¥50-100/米", supplier: "江苏阳光集团", characteristics: ["保暖性好", "不易变形", "性价比高"], usage: ["西装", "外套", "裤子"] },
  "棉麻": { name: "棉麻混纺", composition: "棉50%/麻50%", weight: "130-180g/m²", width: "145cm", price: "¥25-50/米", supplier: "河北宁纺集团", characteristics: ["透气凉爽", "天然质感", "比纯麻更柔软"], usage: ["衬衫", "连衣裙", "休闲装"] },
  "雪纺": { name: "雪纺面料", composition: "涤纶/锦纶", weight: "50-80g/m²", width: "150cm", price: "¥15-35/米", supplier: "吴江盛泽纺织城", characteristics: ["轻盈飘逸", "透气性好", "适合夏季"], usage: ["连衣裙", "衬衫", "丝巾"] },
  "呢料": { name: "呢料面料", composition: "羊毛/涤纶", weight: "300-500g/m²", width: "150cm", price: "¥60-120/米", supplier: "江苏阳光集团", characteristics: ["厚实保暖", "质感高级", "适合秋冬"], usage: ["大衣", "外套", "西装"] },
  "羽绒": { name: "羽绒面料", composition: "羽绒90%", weight: "按件计算", width: "按需", price: "¥200-500/件", supplier: "山东如意集团", characteristics: ["轻盈保暖", "蓬松度高", "保暖性极佳"], usage: ["羽绒服", "羽绒被"] },
};

const SEASON_FABRIC_DATA = {
  "SS": {
    season: "春夏",
    recommended: ["棉", "麻", "丝", "棉涤", "雪纺", "薄纱"],
    characteristics: ["轻薄透气", "凉爽舒适", "吸湿排汗"],
    avoid: ["羊毛", "羊绒", "厚重面料"],
  },
  "AW": {
    season: "秋冬",
    recommended: ["羊毛", "羊绒", "涤纶", "混纺", "呢料", "羽绒"],
    characteristics: ["保暖性好", "厚实耐用", "防风御寒"],
    avoid: ["薄纱", "雪纺", "轻薄面料"],
  },
};

export async function searchFabricSuppliers(query: string): Promise<FabricSupplier[]> {
  const results = FABRIC_SUPPLIERS.filter(supplier => 
    supplier.specialties.some(s => s.includes(query)) ||
    supplier.name.includes(query) ||
    supplier.location.includes(query)
  );
  return results;
}

export async function getFabricDetails(fabricName: string): Promise<FabricDetail | null> {
  const normalizedName = fabricName.replace(/\s+/g, "");
  for (const [key, detail] of Object.entries(FABRIC_DETAILS)) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return detail;
    }
  }
  return null;
}

export async function getSeasonFabrics(season: string): Promise<any> {
  const seasonType = season.includes("春夏") || season.includes("SS") ? "SS" : "AW";
  return SEASON_FABRIC_DATA[seasonType as keyof typeof SEASON_FABRIC_DATA];
}

export async function searchFabricsByTheme(theme: string): Promise<FabricDetail[]> {
  const themeMap: Record<string, string[]> = {
    "极简都市": ["棉", "羊毛", "羊绒", "真丝", "醋酸纤维"],
    "复古浪漫": ["雪纺", "蕾丝", "棉麻", "印花真丝", "网纱"],
    "运动休闲": ["纯棉", "聚酯纤维", "氨纶", "摇粒绒", "防风面料"],
    "新中式": ["真丝", "棉麻", "云锦", "亚麻", "桑蚕丝"],
    "奢华精致": ["真丝", "羊绒", "绸缎", "天鹅绒", "皮革"],
    "街头潮流": ["牛仔布", "帆布", "聚酯纤维", "机能面料"],
    "田园清新": ["棉麻", "印花棉布", "蕾丝", "雪纺"],
  };

  const matchedFabrics = themeMap[theme] || themeMap["极简都市"];
  const results: FabricDetail[] = [];
  
  for (const fabricName of matchedFabrics) {
    const detail = await getFabricDetails(fabricName);
    if (detail) {
      results.push(detail);
    }
  }
  
  return results;
}

export async function generateMarketReport(query: string): Promise<string> {
  const [xhs, tb, dy] = await Promise.all([
    crawlXiaohongshu(query),
    crawlTaobao(query),
    crawlDouyin(query),
  ]);

  const xhsData = xhs.data;
  const tbData = tb.data;
  const dyData = dy.data;

  let report = `📋 市场需求洞察报告\n\n---\n\n## 📊 综合趋势分析\n\n**搜索关键词：** ${query}\n\n**核心趋势：**\n`;
  
  report += xhsData.trends?.slice(0, 3).map((t: any) => `- ${t.trend}（置信度${t.confidence}%）`).join("\n") || "暂无数据";
  
  report += `\n\n**热门关键词：**\n${xhsData.trendingKeywords?.slice(0, 5).join("、") || "暂无数据"}`;
  
  report += `\n\n---\n\n## 👗 爆款商品分析\n\n`;
  
  report += tbData.hotProducts?.slice(0, 4).map((p: any) => `**${p.name}**\n- 销量：${p.sales.toLocaleString()}\n- 增长率：${p.growthRate}\n- 价格区间：${p.price}`).join("\n\n") || "暂无数据";
  
  report += `\n\n---\n\n## 📱 社媒热度\n\n**小红书热门帖子：**\n${xhsData.hotPosts?.slice(0, 3).map((p: any) => `- ${p.title}（点赞：${p.likes.toLocaleString()}）`).join("\n") || "暂无数据"}`;
  
  report += `\n\n**抖音热门话题：** ${dyData.trendingTopics?.join("、") || "暂无数据"}`;
  
  report += `\n\n---\n\n## 💡 建议\n\n基于以上数据分析，建议：\n1. 关注**极简主义**和**可持续时尚**趋势\n2. 重点布局**外套**和**配饰**品类（增长较快）\n3. 定价策略参考爆款价格区间，保持竞争力\n\n如需深入分析某个特定品类或趋势，请告诉我！`;

  return report;
}