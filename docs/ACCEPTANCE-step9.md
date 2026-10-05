# 第9步：OpenAI兼容模型与受限工具循环

日期：2026-10-05（Asia/Shanghai）。模拟协议与完整本机自动验收通过：Python130、Node8、Electron14均无跳过，契约/类型/构建、重复迁移/current/check通过；head=0005_model_limits。开发记录见EVIDENCE第24节，发布复验见第25节。开发轮未配置模型、真实验证未执行；发布轮用户本机配置后，一次真实模型工具验证通过（2次模型请求、1次成功工具回传、8个事件、completed）。行情仍为模拟数据。本步按独立发布授权通过 [PR #8](https://github.com/ydflow/research-trail/pull/8)交付，最终PR/合并状态以GitHub和发布回执为准，不执行第10步。

## 实现与限制

- Python OpenAIModelProvider：Base URL + `/chat/completions`、模型ID、Windows系统凭证中的API Key。非流式Chat Completions，不实现Responses、增量模型流或厂商全部扩展。
- 同一AgentRunner/ToolRegistry/RunManager/Store/SSE，fake_agent默认保留；openai_agent必须显式选择，真实错误不回退假模型。运行与历史标签分别保存。
- 真实运行默认最多8轮且累计8次只读工具执行，整体120秒、单次请求30秒；设置可调1—32次、1—600秒、1—120秒。原假模型SCENARIOS演示时序保持。一次运行使用一致配置快照，后续编辑只影响新运行。
- 注册工具只开放market.quote、market.kline；wire名称market_quote、market_kline。整批校验JSON/字段/US symbol/唯一ID后才执行，执行边界复验；超额或非法批次零执行。最多限制值+1次模型请求，最后一次允许生成回复。
- 不自动重试/跟随重定向/使用环境代理，远程HTTPS、本机可HTTP。请求上下文1MiB、响应256KiB、最终回复4000字符、输出1024 tokens限制。取消关闭HTTP请求、停止后续工具/模型，迟到结果不写回。
- Key只入请求头，校验/传输错误固定错误码，已知Key的回复反射脱敏；API、事件、日志、诊断不返回Key或provider错误原文。诊断的scope=connection-probes只描述假探针，真实运行结果与错误看会话记录。

协议依据：[OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)、[Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。接口按该协议实现不代表所有兼容服务都已验收。

## 自动验证与桌面观察

新增Python模拟协议40项通过：多轮assistant/tool回传、共用事件、注册/参数/批次拒绝、8次上限及重复ID、HTTP认证/限流/重定向/网络、异常JSON/消息/finish_reason/空工具对象、请求/整体超时、取消与实际本机socket断开、运行中配置快照、已知Key反射脱敏、限制校验、旧第8步配置/资料/会话迁移保持；少量真实验证入口的模拟测试证明最多两次请求、日常库只读。

新增Electron实窗1项：未配置失败→设置本机HTTP fixture/模型ID/测试占位Key/1次限制→模型协议fixture选择工具→Python执行→返回fixture→回复/模拟行情卡片→TOOL_LIMIT→取消真实本机HTTP流→切回假模型→同库重启历史一致、无新请求。所有HTTP响应来自模拟脚本，不是外部真实LLM。

Browser plugin not available，使用项目已有Playwright Electron，无新增浏览器依赖。

| QA检查 | 结果与证据 |
| --- | --- |
| 页面身份 | 标题研迹 · ResearchTrail，dist/renderer/index.html；真实Electron窗口 |
| 非空首屏 | 初始研迹/健康/行情导航可见，已截图查看 |
| 框架错误覆盖层 | 无Vite错误overlay |
| 控制台 | 目标流程console warning/error和pageerror为空 |
| 截图 | 1100×800、600×620已查看；首屏、模型限制、工具结果和取消，无横向溢出，长内容纵向滚动 |
| 交互证明 | 设置保存/密码框清空、模型选择/未配置、工具回传/限制、HTTP取消、重启历史保持 |

截图与测试库均在仓库外Temp，测试系统凭证已清理，不上传。本轮初次统一检查发现更改既有“模拟工具时序”标签导致两项旧桌面回归定位失败；恢复原标签，保留原断言，目标3项复验通过。最终完整检查结果单独见EVIDENCE第24节。

## 用户亲自操作（待填写）

```cmd
cd /d "D:\folio\research-trail"
call start-dev.cmd
```

先用默认假模型查询AAPL.US确认行情卡片标模拟数据；未配置时选真实模型运行应显示MODEL_UNCONFIGURED或MODEL_CREDENTIAL_MISSING，不能制造成功。若要真实验证，你只在本机模型设置保存服务提供的Base URL、模型ID与API Key，保留8/120/30默认或更低限制；不要把Key发到聊天，不把“测试假连接成功”当真实服务证明。

配置后明确运行以下入口，它只读日常配置/系统凭证，在独立临时库执行同一链路，最多两次模型请求、一次工具调用；输出只含状态/错误码/计数/证据目录，不打印Key/地址/模型ID/个人资料：

```cmd
cd /d "D:\folio\research-trail\services\backend"
.venv\Scripts\python.exe -m research_trail.verify_live --run
```

不带`--run`只检查配置。返回not_executed表示未执行；passed必须最终completed并有一次成功tool_result，直接回复而无工具不算通过。failed按reason定位，不自动重试或假替代。开发轮结果：not_executed / MODEL_UNCONFIGURED / requests_started=0；发布轮实际结果：passed / completed / requests_started=2 / tool_results=1 / event_count=8 / market_source=fixture。仅公开计数与状态，日常配置、Key、临时验证库及回复内容不上传。

本机配置/真实验证人、时间、状态、计数：待用户填写，不记录Key。

## 尚未验证

当前本机配置的一次真实模型工具循环通过，外部认证失败/限流/超时/阻塞取消仅模拟验证；未覆盖所有服务商与模型、费用账单、外部TLS/DNS阻塞取消、其他OS、安装包/无工具机器/空缓存安装、长时间并发压力、厂商扩展/Responses/模型流。真实行情/账户未接入；当前工具数据始终Fixture，模型回复不等于投资事实核验。系统条目极端崩溃清理、普通Python字符串内存擦除的既有边界保持。发布轮干净源码及远程CI结果单独见EVIDENCE第25节，不代填用户亲自操作与练习。
