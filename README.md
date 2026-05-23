# DownGit - Motrix 下载增强版 🚀

## 📌 项目简介

本项目是知名 GitHub 文件夹/单文件下载工具 [DownGit](https://github.com/MinhasKamal/DownGit) 的深度定制修改版。

原版 DownGit 的工作机制是在浏览器端通过 API 递归请求所有文件的数据，然后在浏览器内存中压缩打包成 ZIP，最后触发浏览器下载。当面对大文件、包含超多子文件的深层文件夹或网络不稳定时，极易因浏览器内存耗尽、页面卡顿或速率受限而失败。

**DownGit - Motrix 增强版** 将整个“下载与压缩”阶段外包给本地运行的 **Motrix Next**（基于现代 Tauri 2 和 Aria2 Next 重新构建的高速多线程下载器）。该版本通过 GitHub API 递归解析得到文件树结构和直连下载 URL 后，直接通过 **Motrix JSON-RPC API** 将下载任务并行发送给 Motrix，支持并发下载、路径保存、自定义 Headers 及 GitHub Token 凭证配置，为您提供快速稳定的 GitHub 资源获取体验。

---

## ✨ 核心特性

* **📱 极简高阶暗黑拟玻（Glassmorphism）视觉设计：**
    全新设计的黑曜石质感界面，支持流畅的鼠标悬浮微交互、发光输入框聚焦与动态进度脉冲指示器，提供更加极致 premium 的使用体验。
* **🔌 完美的 Motrix Next 集成：**
    免去浏览器自身下载负担。解析完成后，一键将任务全部并行提交至本地 Motrix 桌面客户端，多线程满速下载。
* **📂 自动保持目录层级结构：**
    利用 Aria2 的 `out` 参数，自动在 Motrix 下载路径下还原该 GitHub 仓库的完整文件夹树状层级，而非将所有文件杂乱地堆在一个扁平目录下。
* **🔒 本地持久化配置（LocalStorage）：**
    输入过的 Motrix RPC 端口/密钥、GitHub Access Token 等配置将自动安全地保存在您当前浏览器的 `localStorage` 中，无需每次重新输入。
* **🔑 GitHub Access Token (PAT) 完美集成：**
    支持配置自定义 Token。一方面可解除 GitHub API 限制（非登录状态仅 60 次/小时，极易在解析大目录时超限），另一方面可以完美下载您名下的 **私有仓库 (Private Repositories)** 资源！
* **🛡️ 高级 HTTP 头部 (Headers) 自定义重写：**
    可开启高级选项，手动或自动覆盖 Cookie、User-Agent、Referer，进一步绕过各种防盗链限制。

---

## 🛠️ 部署指南 (Deployment Guide)

> [!NOTE]
> **💡 核心要点：无需任何 Node/npm 构建或打包！**
> 本项目使用的是 **AngularJS 1.5.6 (即 Angular 1.x)**，所有类库全部直接通过公共 CDN (jsdelivr/googleapi/bootcss) 动态加载。它是一个**纯静态的前端网页项目 (Pure Static Front-end Website)**。
>
> **没有编译步骤！没有构建打包脚本！** 它的整个内容就是基础的 HTML, CSS, JS 静态文件，可以在任何能够承载静态资源的服务器上瞬时发布。

### 方式一：本地直接运行 (最简单)

您不需要配置任何服务器环境，只需两步即可在本地计算机使用它：

1. 双击直接在浏览器中打开项目根目录下的 [index.html](file:///d:/Github/proxy/DownGit-Motrix/index.html) 网页。
2. 建议开启本地简易静态服务器以获得更好的资源加载体验。例如使用 Python：

   ```bash
   # 在项目根目录下打开终端，执行以下命令：
   python -m http.server 8000
   ```

   然后在浏览器中访问 `http://localhost:8000` 即可使用。

---

### 方式二：自动部署到 GitHub Pages (推荐，最省心)

如果您想把这个工具发布出去，或者建一个自己专属的在线下载面板，部署到 **GitHub Pages** 是最完美的选择。我们已经为您预装了 **GitHub Actions 自动化部署流水线**。

#### 自动化部署步骤

1. 在 GitHub 上新建一个仓库（例如命名为 `DownGit-Motrix`）。
2. 将此本地目录初始化为 Git 仓库并推送到 GitHub：

   ```bash
   git init
   git add .
   git commit -m "feat: init downgit-motrix implementation"
   git branch -M main
   git remote add origin https://github.com/您的用户名/DownGit-Motrix.git
   git push -u origin main
   ```

3. 打开您在 GitHub 上的仓库网页，依次点击 **Settings** -> **Pages**。
4. 在 **Build and deployment** 下的 **Source** 选项中，选择 **GitHub Actions**。
5. 每次您向 `main` 或 `master` 分支推送代码时，`.github/workflows/deploy.yml` 任务会自动触发，并在 1 分钟内将网站发布到您的专属 GitHub Pages 网址：`https://您的用户名.github.io/DownGit-Motrix/`。

---

### 方式三：传统 Web 服务器部署 (Nginx / Apache / CDN)

如果您拥有独立的云服务器，只需要将本项目的所有文件拷贝到服务器的 Web 静态资源目录下。

**例如 Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name downgit.yourdomain.com;

    location / {
        root /path/to/DownGit-Motrix; # 本项目在您服务器上的绝对物理路径
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ⚙️ 配合 Motrix 使用指南

为了保证任务可以正常提交给 Motrix，请确保以下配置已就绪：

1. **打开并运行 Motrix / Motrix Next 客户端。**
2. **确认 RPC 设置：**
   * 进入 Motrix 偏好设置 -> **进阶设置**。
   * 查看 **RPC 监听端口**（默认通常为 `16800`，Motrix Next 同样默认 `16800` 或 `16801`）。
   * 查看 **RPC 授权密钥**（即 API 令牌密匙，若未设置则本项目的“RPC Secret”一栏留空即可；若有设置，请将密匙填入页面配置中）。
3. **在 DownGit-Motrix 网页的配置面板中配置：**
   * 输入您的 Motrix 真实 RPC URL（通常为 `http://localhost:16800/jsonrpc`）。
   * 填写您的 RPC Secret (密钥)。
   * 如果想把解析的文件下载到特定目录中，可在 **Custom Download Subpath** 填入相对子路径（例如：`github-downloads`），Motrix 会自动在您默认下载路径中创建该文件夹。

---

## 📜 开源协议

本项目基于原作者 [Minhas Kamal](https://github.com/MinhasKamal) 的开源代码修改，遵循 [MIT License](https://opensource.org/licenses/MIT) 开源协议。
