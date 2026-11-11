# 营力特路养 YLT-RoadPAM · 道路工程养护资产管养系统

**YLT-RoadPAM** · 项目台账、工程养护、费用凭证、人员档案与企业资质管养中台。

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](#)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](#)
[![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57?logo=sqlite&logoColor=white)](#)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-1.27-009639?logo=nginx&logoColor=white)
[![线上平台](https://img.shields.io/badge/%E7%BA%BF%E4%B8%8A%E5%B9%B3%E5%8F%B0-pam.etgq.com-2ea44f)](https://pam.etgq.com/)

## 项目简介

面向道路工程与养护项目的日常运营，将项目台账、费用凭证、合同履约、人员考勤和企业资质集中管养，减少 Excel 台账与线下签字之间的重复录入。系统为单实例 Flask 应用，使用 SQLite 保存业务数据，页面由 Jinja2 服务端渲染，前端少量原生 JavaScript 负责台账、考勤的交互增强。

线上平台：<https://pam.etgq.com/> · 部署配置见 [deploy/](deploy/)

## 核心能力

| 能力 | 说明 |
| --- | --- |
| 项目台账与看板 | 项目台账、经营看板、费用分类与状态查询，支持新增、编辑、删除项目 |
| 费用凭证 | 凭证录入、附件保存、分类、编辑、作废与导出，可按项目查看账套 |
| 待补录与导入批次 | `/ledger-pending` 处理待补录费用，`/batch` 处理导入批次并逐条确认入库 |
| 人员与工资 | 人员档案、工资表（salary-sheets）、工资结算与导出，支持人员配置维护 |
| 考勤管理 | 月度总览与移动端「按日登记」、一键填报工作日、考勤导入导出、人员额度与设置 |
| 合同与资质 | 合同台账、劳动合同 Word 生成、签署件上传；企业资质、公司信息与有效期维护 |
| 文件处理 | Excel 导入导出，PDF 与图片识别（可选模型 OCR，人工复核） |
| 系统设置 | 管理员账户、密码修改、常规设置与 AI 配置连通性测试 |

OCR 结果不能替代原始凭证；金额、人员和合同信息应经过业务人员确认。

### 近期改进（2026-09）

- **手机端考勤**：760px 及以下默认进入「按日登记」，按人按日点选上班/请假/未登记；桌面端保留月度矩阵，可手动切换。一键填报只补录空白工作日、不覆盖已有记录、不填周末，重复执行不重复新增。它是整月补录工具，不判断法定节假日。
- **手机端台账**：项目列表、项目账套与全盘财务明细在手机下展示为纵向卡片，保留原有服务端筛选与分页；汇总与筛选默认折叠，操作带文字、触控目标不小于 44px，弹窗改为底部面板并支持 Escape 关闭与焦点恢复。
- **视觉与导航改版**：统一工作台样式与深色模式，导航按「工作空间 / 业务管理」分组，看板增加常用操作入口；修正项目页写死的金额摘要，改为按项目状态统计。

改动细节与验证记录见 [docs/attendance-mobile-2026-09-16.md](docs/attendance-mobile-2026-09-16.md)、[docs/ledger-mobile-2026-09-17.md](docs/ledger-mobile-2026-09-17.md)、[docs/workbench-redesign-2026-09-16.md](docs/workbench-redesign-2026-09-16.md)。上述移动端改进使用独立临时数据库与 Chrome 视口模拟验证，尚未部署上线，也不等同于真机 Safari / 微信浏览器验收。

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 语言与框架 | Python 3.11+、Flask 3（单 `web` Blueprint，59 个路由） |
| 页面渲染 | Jinja2 服务端渲染、响应式 CSS（`workbench.css`、`mobile.css`、`ledger-mobile.css`）、原生 JavaScript |
| 数据存储 | SQLite（数据库、上传文件与导出文件位于实例目录） |
| 文件处理 | openpyxl（Excel 导入导出）、pymupdf（PDF 解析）、python-docx（劳动合同生成） |
| 认证与安全 | 登录认证、Werkzeug 密码哈希、CSRF 防护、登录失败锁定、上传大小限制 |
| 可选 OCR | 火山方舟 Ark 模型（`doubao-seed-2-0-pro-260215`），结果需人工复核 |
| 部署 | Docker Compose（`python:3.12-slim` 运行镜像）+ Nginx 1.27 反向代理 |
| 测试 | pytest，`tests/` 下 23 个测试文件 |

## 目录结构

```text
YLT-RoadPAM/
├── construction_maintenance/
│   ├── __init__.py           应用工厂入口
│   ├── app.py                create_app、健康检查 /health
│   ├── commands.py           flask ledger_import 命令
│   ├── config.py             环境变量与路径配置
│   ├── db.py                 SQLite 连接与迁移
│   ├── finance.py            金额与财务口径
│   ├── repositories.py       数据访问与密码校验
│   ├── security.py           登录、CSRF 与访问控制
│   ├── services/             dashboard、exports、imports、ledger_import、ocr、contract_generator
│   ├── web/                  forms.py、routes.py（Blueprint "web"）
│   ├── templates/            20 个 HTML 模板（含部分模板）与 docx_templates/ 劳动合同模板
│   └── static/               样式、脚本与 brand 预览图
├── contract_templates/       各类合同模板（.doc/.docx）
├── docs/                     移动端考勤、台账与视觉改版的验证记录
├── tests/                    pytest 测试
├── scripts/                  数据生成、脱敏、导入与核对脚本
├── deploy/                   nginx.conf、nginx-pam.conf.example
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

## 快速开始

要求 Python 3.11+，建议使用虚拟环境，不要使用线上数据库作为测试数据。

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

首次运行前配置管理员与密钥。`CAM_ADMIN_PASSWORD_HASH` 使用 Werkzeug 哈希而非明文，可这样生成：

```sh
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your-password'))"
```

```sh
export CAM_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
export CAM_ADMIN_USERNAME=admin
export CAM_ADMIN_PASSWORD_HASH='pbkdf2:sha256:...'
flask --app construction_maintenance run --host 127.0.0.1 --port 5000
```

访问 `http://127.0.0.1:5000/`，使用 `CAM_ADMIN_USERNAME` 与原始密码登录。仅本地 HTTP 调试可将 `CAM_SESSION_COOKIE_SECURE` 设为 `0`。运行测试：

```sh
pytest
```

浏览器端移动台账回归默认不启动浏览器，设置 `CAM_BROWSER_TESTS=1` 后运行：

```sh
CAM_BROWSER_TESTS=1 .venv/bin/python -m pytest tests/test_ledger_mobile_browser.py -q
```

## 配置

| 环境变量 | 必需 | 说明 |
| --- | --- | --- |
| `CAM_SECRET_KEY` | 是 | 会话密钥，生产环境使用随机高强度值 |
| `CAM_ADMIN_USERNAME` | 首次部署 | 引导管理员账户名 |
| `CAM_ADMIN_PASSWORD_HASH` | 首次部署 | 管理员密码哈希（Werkzeug 生成） |
| `CAM_AUTH_REQUIRED` | 否 | 默认 `1`，生产环境保持登录认证 |
| `CAM_CSRF_ENABLED` | 否 | 默认 `1`，生产环境保持 CSRF 防护 |
| `CAM_SESSION_COOKIE_SECURE` | 否 | 默认 `1`；仅本地 HTTP 调试可设为 `0` |
| `CAM_MAX_UPLOAD_BYTES` | 否 | 上传大小上限，默认 20MB |
| `CAM_SEED_DEMO_DATA` | 否 | 默认 `0`；生产环境禁止启用 |
| `CAM_INSTANCE_DIR`、`CAM_UPLOAD_FOLDER`、`CAM_EXPORT_FOLDER` | 否 | 数据库、上传与导出目录，Compose 下为 `/data/*` |
| `ARK_API_KEY`、`ARK_BASE_URL`、`ARK_MODEL` | 否 | 可选 OCR 模型配置，默认不启用 |

生产密钥通过部署环境注入。`ARK_API_KEY` 等可选配置不能进入 Git；仓库中不保存真实密钥、数据库或上传文件。

## 部署

域名 `pam.etgq.com` 经 Nginx 转发到容器服务，`docker-compose.yml` 提供 app 与 nginx 两个服务：

- app：镜像 `ylt-pam:latest`，容器名 `ylt_pam_app`，暴露 `8000`，宿主机映射 `5000`；健康检查访问容器内 `/health`。
- nginx：`nginx:1.27-alpine`，容器名 `ylt_pam_nginx`，挂载 [deploy/nginx.conf](deploy/nginx.conf) 与（可选）SSL 证书，登录接口限流、上传上限 20MB、开启 gzip。
- 数据卷：`ylt_pam_data` 保存数据库、上传与导出文件；`ylt_pam_nginx_logs` 保存 Nginx 日志；内部网络 `ylt_pam_network`。

```sh
docker compose up -d --build
```

Compose 内置的 Nginx 使用 [deploy/nginx.conf](deploy/nginx.conf)（代理到 `app:8000`）；若由宿主机已有的 Nginx 直接反代容器，可参考 [deploy/nginx-pam.conf.example](deploy/nginx-pam.conf.example) 另建 server 配置，不要直接覆盖 Compose 挂载的配置文件。

现有 Compose 使用 `ylt_pam_data` 保存业务数据。不要删除这个数据卷，也不要因仓库改名更改卷名、容器名或数据库路径。生产密钥通过部署环境注入，发布前备份数据卷、配置和当前镜像，并检查健康状态、登录、凭证查询和导出流程。

## 注意事项

- 本仓库是代码版本，不包含最新业务数据；生产数据位于部署环境的数据卷与备份中。
- 认证与 CSRF 防护在生产环境必须保持开启；不要在生产环境启用 `CAM_SEED_DEMO_DATA` 或执行演示数据脚本。
- `scripts/` 中的导入、脱敏与核对脚本面向维护人员，执行前先备份数据库并在副本上演练。
- OCR 仅作辅助识别，识别结果不能替代原始凭证，入账与合同信息需人工确认。
- 手机端考勤与台账改进以 Chrome 视口模拟验证，真机 Safari / 微信内置浏览器验收与上线情况以实际部署为准。
- 仓库根目录历史 `Carsystem` 引用不属于本平台的运行依赖；运输运营平台单独维护。

## 许可与说明

本仓库未附带 LICENSE / COPYING 文件，代码与素材的使用范围以项目方授权为准；未经授权不得对外分发或用于其他项目。合同模板、证照等素材同样受授权范围约束。

维护记录：2026-09 完成移动端考勤按日登记、移动台账卡片视图、一键填报幂等性与全系统视觉改版，相关验证记录见 [docs/](docs/)；本次升级未更改数据库结构、计薪规则或生产配置。
