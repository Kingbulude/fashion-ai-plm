// AI 图生图改款预设指令
// 前端组件和 API 路由共享

export interface RedesignPreset {
  id: string;
  label: string;
  hint: string;
}

export const REDESIGN_PRESETS: RedesignPreset[] = [
  { id: "color", label: "换配色", hint: "改为暖色调（米白、奶咖、焦糖）" },
  { id: "silhouette", label: "改版型", hint: "改为宽松 Oversize 版型" },
  { id: "fabric", label: "换面料", hint: "改为针织面料，呈现柔软质感" },
  { id: "detail", label: "加细节", hint: "增加口袋和拉链细节" },
  { id: "season", label: "换季节", hint: "改为秋冬款，加厚并搭配内衬" },
  { id: "style", label: "换风格", hint: "改为街头潮牌风格" },
];
