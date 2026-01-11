# AnimaFlow 项目整合方案

## 1. 项目概览 (Project Overview)
**AnimaFlow** 是一个自托管平台，致力于将二维的珍贵回忆（2D 图片）转化为具有真实视差深度的 3D 动态壁纸。本项目整合了 **Sharp** 快速生成模型与 WebGL 渲染器，并通过 Docker 实现云端部署，旨在为 Wallpaper Engine 提供无缝的壁纸服务。

**设计哲学**:
- **极简主义 (Simplicity)**: 摒弃繁琐的鉴权系统，采用“君子协定”式的开放用户管理。
- **美学追求 (Aesthetic)**: 简洁、高端、优雅、现代（深色模式、流畅动效、沉浸式体验）。
- **无感部署 (Deployment)**: 通过 Watchtower + GitHub Actions 实现全自动化的持续交付。

---

## 2. 架构设计 (Architecture)

### 2.1 技术栈 (Technology Stack)
- **后端**: Python (FastAPI)
  - 负责 API 请求处理、数据库管理以及调度 `sharp` 模型进行推理。
  - 提供带有安全响应头（COOP/COEP）的静态资源服务，确保 SharedArrayBuffer 正常工作。
- **前端**: HTML5 + TailwindCSS + JavaScript
  - **仪表盘 (Dashboard)**: 壁纸画廊、上传中心、用户身份切换。
  - **预览器 (Viewer)**: 基于原 `wallpaper_project` 深度定制的渲染引擎，用于预览和参数配置。
- **数据库**: SQLite
  - 存储壁纸元数据（ID、原图路径、PLY 模型路径）。
  - 存储用户数据（仅需用户昵称）。
  - 存储视角配置（与用户或壁纸绑定的 FOV、相机位姿数据）。
- **AI 核心**: `sharp` (作为 Python 模块集成)。

### 2.2 系统流程 (System Workflow)
1.  **上传 (Upload)**: 用户通过仪表盘拖拽上传图片。
2.  **造梦 (Generate)**: 后端接收任务，调用 `sharp` 模型将图片转化为 `.ply` 点云。
3.  **导演 (Director)**: 用户进入“导演模式”，调整最佳视角和 FOV，点击“保存”。
4.  **应用 (Consume)**: 生成专属 URL（如 `/view/{uuid}?user={name}`），填入 Wallpaper Engine 即可使用。

---

## 3. 目录结构重构 (Directory Structure Refactoring)

我们将重新梳理项目结构，在保持原有核心代码可用的基础上，实现模块化管理。

```text
AnimaFlow/
├── .github/
│   └── workflows/
│       └── docker-publish.yml  # CI/CD 自动构建脚本
├── deploy/
│   ├── Dockerfile
│   └── docker-compose.yml
├── data/                       # 持久化数据 (Docker 挂载卷)
│   ├── db/                     # SQLite 数据库文件
│   ├── uploads/                # 原始 2D 图片库
│   └── generated/              # 生成的 PLY 模型库
├── src/                        # 核心应用代码
│   ├── main.py                 # FastAPI 入口
│   ├── database.py             # 数据库模型与逻辑
│   ├── routers/                # API 路由定义
│   ├── services/               # Sharp 模型调用与图像处理逻辑
│   └── templates/              # Jinja2 页面模板
├── static/
│   ├── css/                    # Tailwind 样式 / 自定义 CSS
│   ├── js/                     # 仪表盘交互逻辑
│   └── viewer/                 # 3D 渲染器核心 (原 wallpaper_project)
├── sharp/                      # (现有) Sharp 源代码
└── wallpaper_project/          # (现有) 参考代码 / 资源
```

---

## 4. 核心功能实现 (Key Features)

### 4.1 仪表盘 (Dashboard UI/UX)
*   **风格**: 深色主题，采用毛玻璃拟态（Glassmorphism）设计，细字体，大留白。
*   **身份切换**: 右上角极简的下拉菜单/弹窗：“当前身份：**[用户昵称]**”。
*   **画廊**: 瀑布流或网格展示已生成的壁纸。鼠标悬停时浮现“预览”、“调整视角”、“获取链接”按钮。
*   **上传器**: 一个极简的拖拽区域，上传时平滑展开进度条，显示“Dreaming...”状态。

### 4.2 “导演模式” (Director Mode)
我们将改造 `wallpaper_project/main.js` 以支持动态配置。
*   **悬浮控制台**: 仅在导演模式下可见的半透明面板。
    *   [滑块] 视场角 (FOV) 调整
    *   [按钮] 重置相机
    *   [按钮] **保存视角** (将当前 View Matrix 发送至后端 API)。

### 4.3 多用户逻辑 (Multi-User)
*   单一入口：`http://server-ip:8000`。
*   **壁纸链接**: `http://server-ip:8000/view/{uuid}`。
    *   支持参数：`?user={name}`。后端根据用户名加载该用户偏好的视角配置。
    *   默认逻辑：如果未指定用户或配置，加载该壁纸的“全局默认”视角。

---

## 5. 部署策略 (Deployment)

### 5.1 Dockerfile
*   **基础镜像**: `python:3.11-slim` (配合 `nvidia-*` pip 包以支持 CUDA 运行时)。
*   **构建步骤**:
    *   安装系统依赖 (libgl1 用于 opencv)。
    *   安装 Python 依赖 (FastAPI, Uvicorn, Sharp 依赖)。
    *   复制 `src`, `static`, 以及 `sharp` 源码。
*   **启动命令**: `uvicorn src.main:app --host 0.0.0.0 --port 8000`

### 5.2 GitHub Actions
*   **触发器**: 推送至 `main` 分支。
*   **动作**: 构建 Docker 镜像 -> 推送到 Docker Hub。
*   **更新**: 服务器端的 Watchtower 检测到新镜像 -> 自动拉取 -> 重启容器。

---

## 6. 下一步行动 (Execution Phase)

- [x] 1. **脚手架搭建**: 创建 `src` 目录，将 `wallpaper_project` 的核心资源迁移至 `static/viewer`。
- [x] 2. **后端初始化**: 配置 FastAPI，重点处理 COOP/COEP 安全响应头。
- [x] 3. **Sharp 集成**: 编写 Python 服务层，封装 `sharp` 的调用逻辑，替代原有的命令行调用。
- [x] 4. **前端开发**: 使用 Tailwind 构建仪表盘，打造高端视觉体验。
- [x] 5. **Docker 封装**: 完成构建配置与 CI/CD 流程。
