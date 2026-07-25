// AI 营销场景图预设定义
// 前端组件和 API 路由共享

export interface MarketingScene {
  id: string;
  label: string;
  promptSuffix: string; // 拼到基础prompt后
  size: string; // image_size 参数
}

// 6种核心营销场景，覆盖测款、上架、推广用图
export const MARKETING_SCENES: MarketingScene[] = [
  {
    id: "studio_main",
    label: "棚拍主图",
    promptSuffix:
      "professional studio product photography, white seamless background, soft even lighting, high detail, front view, e-commerce main image style",
    size: "square",
  },
  {
    id: "model_front",
    label: "模特上身图",
    promptSuffix:
      "fashion model wearing the clothing, full body shot, neutral pose, studio lighting, clean light gray background, editorial fashion photography",
    size: "portrait_4_3",
  },
  {
    id: "street_style",
    label: "街拍场景图",
    promptSuffix:
      "street style fashion photography, model wearing the clothing walking on urban street, natural sunlight, shallow depth of field, lifestyle shot, candid",
    size: "portrait_4_3",
  },
  {
    id: "detail_closeup",
    label: "细节特写图",
    promptSuffix:
      "extreme close-up detail shot of fabric texture, stitching, buttons and labels, macro photography, soft directional lighting, premium quality showcase",
    size: "square",
  },
  {
    id: "flat_lay",
    label: "平铺展示图",
    promptSuffix:
      "flat lay top-down view of the clothing neatly arranged on clean white surface, with optional accessories, soft natural lighting, styling props, magazine layout",
    size: "landscape_4_3",
  },
  {
    id: "lifestyle_scene",
    label: "生活场景图",
    promptSuffix:
      "lifestyle photography, model in real-life setting (cafe / home / outdoor), wearing the clothing naturally, warm ambient lighting, aspirational mood",
    size: "landscape_4_3",
  },
];
