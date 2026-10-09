# Longbridge 5.2.0 Windows 原生依赖声明

SDK对应源码 `longbridge/openapi@b2f749a3c68cc4f05642b37fc790fb711d2dfb13`，SDK自身的MIT/Apache-2.0文本保留在上层目录。

本目录列出官方 CPython 3.12 / Windows x64 构建任务实际输出的272个编译包：263个外部crate及9个本仓库crate。包含编译时依赖，是保守声明范围，不声称所有包都静态链接进wheel。依据是[该官方构建任务](https://github.com/longbridge/openapi/actions/runs/36694316549/job/109855292957)，不是今天重新解析未锁定源码得到的版本。

`manifest.json`记录每个版本的官方crate地址、实际下载SHA256、公开Cargo.toml许可表达式、原始许可文件hash及版本化来源。构建日志在本机ignored目录，记录其hash；不把日志上传源码仓库。不宣称已经密码学验证PyPI发布证明或完成可复现的SDK二进制重建。

dotenv 0.15.0的发行包没有许可文件，因此从包内`.cargo_vcs_info.json`记录的精确Git提交补取原LICENSE。eventsource-stream 0.2.3与rfc7239 0.1.3的包及对应源码提交均无独立许可文本，但发布Cargo.toml明确声明`MIT OR Apache-2.0`；对这两项选择Apache-2.0，并提供该许可标准全文。所补文本明确标记`DECLARED-APACHE-2.0.txt`，不假称来自原包，不伪造版权人或授权确认。

option-ext 0.2.0与webpki-roots 0.25.4以MPL-2.0发布。其原始许可保留，各自完整、未修改的源码可从manifest中`source_offer.url`所列官方crate下载；该源码在MPL-2.0下可获得。研迹不修改这些依赖，也不限制接收者对该源码的许可权利。来源告知依据[Mozilla MPL说明](https://www.mozilla.org/en-US/MPL/2.0/FAQ/)。

各包版权/NOTICE保持原文；Apache、ISC、Unicode、BSD、CDLA等组合许可按其声明和原文本分别保留，不把全部依赖统一标MIT。此目录不改变研迹或Folio各文件的来源与适用授权。

该任务明确记录Rust 1.98.1 (48a229cea, 2026-09-01)。另保留rust-lang/rust的1.98.1版本MIT/Apache全文，覆盖Rust标准库声明；来源为https://github.com/rust-lang/rust/tree/1.98.1 。`wheel-identity.json`验证本机安装的SDK原生.pyd逐字节等于PyPI所声明SHA256的官方Windows wheel，后续打包须再核对该.pyd未变化。
