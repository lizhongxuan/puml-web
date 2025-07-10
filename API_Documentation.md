# PlantUML 在线编辑器 - API 接口文档

## 概述

PlantUML在线编辑器提供RESTful API接口，支持PlantUML代码的SVG渲染和示例管理。

**服务器地址**: http://localhost:8090  
**PlantUML服务地址**: http://localhost:8888

---

## API 接口列表

### 1. 主页面

**接口**: `GET /`  
**描述**: 返回PlantUML在线编辑器的主页面HTML  
**请求方法**: GET  
**请求参数**: 无  

**响应**:
- **Content-Type**: `text/html; charset=utf-8`
- **状态码**: 200
- **响应体**: HTML页面内容

---

### 2. 渲染PlantUML图表

**接口**: `POST /api/render`  
**描述**: 将PlantUML代码渲染为SVG图表  
**请求方法**: POST  
**Content-Type**: `application/json`

#### 请求参数

```json
{
    "code": "string",     // PlantUML代码 (必填)
    "type": "string"      // 输出类型，固定为"svg" (可选，后端会强制设为svg)
}
```

#### 请求示例

```json
{
    "code": "@startuml\nAlice -> Bob: Hello\nBob -> Alice: Hi!\n@enduml",
    "type": "svg"
}
```

#### 响应参数

**成功响应** (状态码: 200):
```json
{
    "success": true,
    "message": "渲染成功",
    "imageData": "string"    // SVG XML内容
}
```

**错误响应** (状态码: 400/500):
```json
{
    "success": false,
    "message": "错误描述信息"
}
```

#### 响应示例

**成功**:
```json
{
    "success": true,
    "message": "渲染成功",
    "imageData": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?><svg ...>...</svg>"
}
```

**失败**:
```json
{
    "success": false,
    "message": "PlantUML代码不能为空"
}
```

---

### 3. 获取示例代码

**接口**: `GET /api/examples`  
**描述**: 获取预定义的PlantUML示例代码列表  
**请求方法**: GET  
**请求参数**: 无

#### 响应参数

**成功响应** (状态码: 200):
```json
{
    "examples": [
        {
            "name": "string",          // 示例名称
            "description": "string",   // 示例描述
            "code": "string"          // PlantUML代码
        }
    ]
}
```

#### 响应示例

```json
{
    "examples": [
        {
            "name": "简单序列图",
            "description": "基本的序列图示例",
            "code": "@startuml\nAlice -> Bob: 认证请求\nBob --> Alice: 认证响应\n@enduml"
        },
        {
            "name": "用例图",
            "description": "系统用例图示例",
            "code": "@startuml\nleft to right direction\nactor 用户 as u\nrectangle 系统 {\n  usecase \"登录\" as UC1\n}\nu --> UC1\n@enduml"
        }
    ]
}
```

---

### 4. 静态资源

**接口**: `GET /static/*`  
**描述**: 提供静态资源文件 (CSS, JavaScript)  
**请求方法**: GET  

**支持的文件**:
- `/static/styles.css` - 样式文件
- `/static/app.js` - 主要JavaScript文件
- `/static/svg-click-handler.js` - SVG点击处理JavaScript文件

---

## 数据结构定义

### PlantUMLRequest
```go
type PlantUMLRequest struct {
    Code string `json:"code"`  // PlantUML代码
    Type string `json:"type"`  // 固定为"svg"
}
```

### PlantUMLResponse
```go
type PlantUMLResponse struct {
    Success   bool   `json:"success"`           // 请求是否成功
    Message   string `json:"message"`           // 响应消息
    ImageData string `json:"imageData,omitempty"` // SVG内容 (成功时)
}
```

### PlantUMLExample
```go
type PlantUMLExample struct {
    Name        string `json:"name"`        // 示例名称
    Code        string `json:"code"`        // PlantUML代码
    Description string `json:"description"` // 示例描述
}
```

### ExampleResponse
```go
type ExampleResponse struct {
    Examples []PlantUMLExample `json:"examples"` // 示例列表
}
```

---

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 (如代码为空) |
| 405 | 请求方法不允许 |
| 500 | 服务器内部错误 (如PlantUML服务不可用) |

---

## 使用流程

1. **加载页面**: `GET /` 获取主页面
2. **加载示例**: `GET /api/examples` 获取示例列表
3. **渲染图表**: `POST /api/render` 提交PlantUML代码进行渲染
4. **交互功能**: 在返回的SVG中点击元素可跳转到对应代码行

---

## 特殊功能

### SVG点击跳转功能
- **触发条件**: 点击渲染后的SVG图表中的元素
- **功能**: 自动跳转到编辑器中对应的代码行
- **支持元素**: 参与者、类、用例、文本等PlantUML元素
- **实现**: 前端JavaScript解析SVG DOM，添加点击事件监听器

### CORS支持
所有API接口都支持跨域请求，设置了以下CORS头：
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

---

## 部署信息

**Go后端服务**:
- 端口: 8090
- 启动命令: `go run main.go`

**PlantUML服务** (Docker):
- 端口: 8888
- 镜像: `plantuml/plantuml-server:jetty`
- 启动命令: `docker run -d -p 8888:8080 plantuml/plantuml-server:jetty`

**依赖关系**:
```
前端 (浏览器) 
    ↓ HTTP请求
Go后端服务 (localhost:8090)
    ↓ HTTP请求
PlantUML服务 (localhost:8888)
```
