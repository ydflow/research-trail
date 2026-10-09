# 研迹视觉资产

本轮按用户要求为研迹设计专属图标，补充实际功能截图和 README。它是发布后视觉更新，不改写既有 v1.0.0 标签、安装包或验收结果。

## 图标

深翡翠绿承载象牙白折页，金色轨迹贯穿 R 形结构，末端节点代表可回溯的证据。设计强调研究、留痕与复核；不使用收益箭头或交易符号。

原始透明 PNG：[research-trail.png](../apps/desktop/public/brand/research-trail.png)。Windows ICO：[research-trail.ico](../apps/desktop/assets/research-trail.ico)，包含 16、24、32、48、64、128、256 像素帧。ICO 仅通过 Electron nativeImage 做尺寸与格式转换，原 PNG 保留。

生成方式：Codex 内置 image_gen，透明背景；未使用 CLI 或项目模型密钥。已检查视觉，不宣称商标已注册或完成商标检索。最终提示词如下。

```text
Use case: logo-brand
Asset type: exclusive premium Windows desktop application icon for 研迹 / ResearchTrail, a local evidence-based investment research workbench.
Create ONE beautifully resolved original app icon, square 1024x1024 artwork. A sophisticated deep emerald green rounded-square tile, large enough to occupy almost the whole canvas with a thin transparent margin. In the center a bold elegant ivory monogram that subtly reads as R: a folded research page forms its upright and loop, with one continuous champagne-gold evidence trail forming its diagonal leg and ending in a single small circular evidence node. Integrate these shapes into one memorable, balanced silhouette. The idea is knowledge traced through evidence, with a page and a path, not trading hype.
Design language: premium editorial identity, precision geometric construction, gently rounded ends, restrained satin material, very subtle inset depth and soft specular highlight, exceptionally clean edges, substantial line weight, optical balance, generous breathing room. Emerald #153F35 / #24594D, warm ivory #F5F0DF, pale champagne gold #D9BA79. Limited palette, high contrast, recognizable at 32 pixels. Sophisticated and calm, suitable for a serious researcher.
Composition: single straight-on orthographic icon centered on transparent background, rounded square itself opaque; no perspective, no desk, no device, no presentation mockup, no extra variants. No text, no wordmark, no letters outside the abstract central monogram, no watermark. Avoid stock charts, candlesticks, upward arrows, dollar signs, magnifying glasses, robot heads, generic AI sparkles, excessive gradients and neon glow. Final deliverable is the actual isolated app icon, no decorative background.
```

## 功能实拍

`docs/assets/features/` 中图片由 Playwright 捕获实际 Electron 应用，使用全新临时数据库、研迹原创固定模拟行情、规则模型与离线实验。截图没有用户账户、持仓、密钥或真实模型输出，没有用生成图片伪造功能界面。

截图入口、模式、尺寸及 SHA256 记录于 [PUBLIC-ASSETS.json](PUBLIC-ASSETS.json)。截取的是应用视窗或实际组件区域，没有拼接、修饰或修改数据。捕获脚本为 [capture-public-gallery.cjs](../scripts/capture-public-gallery.cjs)，默认写入临时目录，离线保护启用；只有完成视觉审查的图片才放进公开资产目录。

源码中已接入页头、窗口及后续 Windows 打包图标。公开 v1.0.0 安装器仍为原验收构建，含旧默认图标；本轮不会覆盖该附件。

本轮验证与公开范围见 [ACCEPTANCE-brand-gallery.md](ACCEPTANCE-brand-gallery.md)。GitHub About 使用“本地 AI 投资研究工作台”的场景描述，附版本下载入口和相关主题词；不宣称收益或未验证的质量。
