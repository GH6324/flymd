# flyMD 协同服务器（开源版）

本目录提供一个最小可用的协同服务器，仅依赖 Node.js 和 `ws`，不包含任何后台管理、数据库或付费逻辑，适合作为开源示例或个人自建协同空间使用。

## 功能特性

- WebSocket 协同接口：`/ws`
- 按房间号 + 密码划分协同空间，首次连接自动创建房间
- 文本内容在内存中维护（进程重启后内容清空）
- 简单多人协同：整篇文档广播 + 行/段落级锁
- 内置基本保护：
  - 单条消息大小上限（默认 256KB）
  - 单房间内容长度上限（默认 1MB）
  - 单连接更新频率限制（默认 10 秒内最多 60 次 `update`）

## 环境要求

- Node.js 18 或以上
- 根目录已安装依赖（`npm install`，需要 `ws`）

## 启动方式

上传OSserver文件到服务器，执行：

```bash
npm init -y        #
npm install ws     
node server.js
```

默认端口为 `3456`，可通过环境变量调整：

- `COLLAB_OS_PORT` 或 `PORT`：HTTP / WebSocket 监听端口（默认 `3456`）
- `COLLAB_OS_PASSWORD_SALT`：房间密码哈希盐值（可选，默认 `flymd-os-collab`）

健康检查接口：

- `GET /health` → `{ "ok": true }`

WebSocket 地址示例：

- `ws://127.0.0.1:3456/ws`

## 反向代理

```nginx
# 统一代理 / 下的 HTTP 请求（health 等）
location / {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_pass http://127.0.0.1:3456/;
}

# 单独给 WebSocket /ws 做升级
location /ws {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # 将外部的 /ws 请求转发到后端 Node 进程的 /ws（OSserver 只认 /ws）
    proxy_pass http://127.0.0.1:3456/ws;
}
```

## 协议说明（与内置闭源版保持兼容）

### 连接参数

客户端以 QueryString 方式传递参数，例如：

```text
ws://127.0.0.1:3456/ws?room=demo&password=123456&name=fly
```

- `room`：房间号（协同空间标识）
- `password`：房间密码
- `name`：显示名称（可选）

首次有客户端连接某个 `room + password` 时，服务器会自动创建房间；之后再连该房间时需要提供相同密码。

### 消息类型（JSON）

- 客户端 → 服务器：
  - `{"type":"join","content":"当前全文内容"}`：首次连接时发送，用于空房间初始化内容
  - `{"type":"update","content":"当前全文内容"}`：文本更新
  - `{"type":"lock","blockId":"b_xxx","label":"标题","color":"#rrggbb"}`：请求锁定某一行/段（可选）
  - `{"type":"unlock","blockId":"b_xxx"}`：释放锁
  - `{"type":"ping"}`：心跳

- 服务器 → 客户端：
  - `{"type":"snapshot","content":"全文内容"}`：加入房间后的初始快照
  - `{"type":"update","content":"全文内容"}`：其他客户端更新后的最新内容
  - `{"type":"locks_state","locks":[{blockId,name,color,label}]}`：当前所有锁状态
  - `{"type":"peers","peers":["A","B"]}`：当前在线协作者列表
  - `{"type":"lock_error","code":"locked_by_other","blockId":"b_xxx","name":"someone"}`：锁定失败
  - `{"type":"error","code":"bad_request" | "bad_password" | "message_too_large" | "content_too_large" | "too_many_updates","message":"..."}`

## 搭配协同插件使用

前往扩展市场安装


插件配置面板中需要填写：

- 协同服务器地址：如 `ws://127.0.0.1:3456/ws`
- 房间号：任意字符串，例如 `demo`
- 房间密码：任意字符串，例如 `123456`
- 显示名称：在协同中显示的昵称（可选）

填写后点击“连接”，插件会与本服务器建立 WebSocket 连接并开始同步当前文档内容。

## 注意事项

- 所有房间信息与内容仅保存在内存中，**重启进程后会全部丢失**。
- 未做账号体系，仅按 `room + password` 区分空间。
