# AnimaFlow - 3D Gaussian Splatting Parallax Wallpaper

这是一个基于 **3D Gaussian Splatting** 技术的动态视差壁纸项目。它不像传统视频壁纸那样仅仅是播放录像，而是实时渲染一个真实的辐射场（Radiance Field）场景。

当您的鼠标在屏幕上移动时，相机也会随之产生细微的位移，带来真实的 **3D 景深** 和 **透视遮挡** 效果，仿佛您的屏幕是一扇通往另一个世界的窗户。

---

## 🚀 快速启动 (Quick Start)

### 1. 启动本地服务器
由于浏览器安全策略（CORS 和 SharedArrayBuffer），本项目必须运行在服务器环境下。

双击打开项目目录下的终端，运行：
```bash
python server.py
```
*注意：请保持这个黑色窗口一直运行，不要关闭。*

### 2. 预览
打开浏览器访问：[http://localhost:8000](http://localhost:8000)

---

## 🎨 定制您的专属视角 (Customization)

如果您更换了新的 `.ply` 模型，或者想调整现有模型的角度和大小，请按照以下步骤操作：

### 第一步：进入“导演模式”
用代码编辑器打开 `main.js`，找到顶部的配置区，将开关打开：
```javascript
const SETUP_MODE = true; // <--- 改为 true
```
保存并刷新浏览器。

### 第二步：调整画面
现在您进入了调试模式：
1.  **鼠标拖拽**：旋转和移动模型。
2.  **鼠标滚轮**：缩放模型。
3.  **右下角面板**：
    *   **FOV 滑块**：向左拉（变小）可以获得“长焦”效果，消除边缘黑边；向右拉（变大）获得广角效果。
    *   **旋转按钮**：如果模型是躺着的，点此快速修正。

### 第三步：导出配置
调整到满意的画面后，点击右下角的 **“💾 导出最终配置”** 按钮。
此时，浏览器的控制台（按 `F12` 打开 Console 面板）会输出一段代码。

### 第四步：应用配置
1.  复制控制台里的那段 `const MODEL_CONFIG = { ... }` 代码。
2.  回到 `main.js`，替换掉原本的配置区域。
3.  最后，别忘了关闭导演模式：
    ```javascript
    const SETUP_MODE = false; // <--- 改回 false
    ```
4.  保存并刷新，享受您的纯净壁纸！

---

## 🖥️ 设置为桌面壁纸

### 方案 A：Lively Wallpaper (推荐/免费)
1.  打开 Lively Wallpaper。
2.  点击 **+ (添加壁纸)**。
3.  在“输入 URL”栏中填入：`http://localhost:8000`。
4.  点击箭头，起个名字，完成。

### 方案 B：Wallpaper Engine
1.  打开 Wallpaper Engine。
2.  点击 **“打开壁纸” -> “打开 URL”**。
3.  填入 `http://localhost:8000`。

---

## ⚡ 进阶：开机自动启动

为了避免每次都要手动运行 `server.py`，您可以创建一个自动启动脚本。

1.  在项目文件夹内新建一个文本文件，重命名为 `Start_Wallpaper.bat`。
2.  右键点击 -> 编辑，粘贴以下内容（请确保路径正确）：
    ```batch
    @echo off
    cd /d "%~dp0"
    start /min python server.py
    ```
3.  保存文件。
4.  按 `Win + R` 键，输入 `shell:startup` 并回车。
5.  将刚才做好的 `Start_Wallpaper.bat` 创建一个快捷方式，丢进这个打开的文件夹里。

从此，您的 3D 壁纸将随电脑启动自动待命！
