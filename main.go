package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// PlantUMLRequest 请求结构
type PlantUMLRequest struct {
	Code string `json:"code"`
	Type string `json:"type"` // 固定为svg
}

// PlantUMLResponse 响应结构
type PlantUMLResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	ImageURL string `json:"imageUrl,omitempty"`
	ImageData string `json:"imageData,omitempty"`
	CodeMap []CodeMapping `json:"codeMap,omitempty"` // 代码映射
}

// CodeMapping 代码映射结构
type CodeMapping struct {
	ElementID string `json:"elementId"`
	ElementName string `json:"elementName"`
	LineNumber int `json:"lineNumber"`
	CodeLine string `json:"codeLine"`
}

// ExampleResponse 示例响应结构
type ExampleResponse struct {
	Examples []PlantUMLExample `json:"examples"`
}

// PlantUMLExample 示例结构
type PlantUMLExample struct {
	Name string `json:"name"`
	Code string `json:"code"`
	Description string `json:"description"`
}

// Config 配置结构
type Config struct {
	Port        string
	PlantUMLURL string
}

var config = Config{
	Port:        ":8090",
	PlantUMLURL: "http://localhost:8888", // Docker PlantUML服务地址
}

func main() {
	// 创建HTTP路由
	mux := http.NewServeMux()
	
	// 路由设置
	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/api/render", corsMiddleware(renderHandler))
	mux.HandleFunc("/api/examples", corsMiddleware(examplesHandler))
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	
	// 启动服务器
	log.Printf("PlantUML在线编辑器启动在端口 %s", config.Port)
	log.Printf("PlantUML服务地址: %s", config.PlantUMLURL)
	
	if err := http.ListenAndServe(config.Port, mux); err != nil {
		log.Fatal("服务器启动失败:", err)
	}
}

// CORS中间件
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next(w, r)
	}
}

// 主页处理器
func homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}
	http.ServeFile(w, r, "static/index.html")
}

// PlantUML渲染处理器
func renderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}
	
	var req PlantUMLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, "无效的请求数据", http.StatusBadRequest)
		return
	}
	
	if strings.TrimSpace(req.Code) == "" {
		respondWithError(w, "PlantUML代码不能为空", http.StatusBadRequest)
		return
	}
	
	// 只支持SVG格式
	req.Type = "svg"
	
	// 调用PlantUML服务
	imageData, err := callPlantUMLService(req.Code, req.Type)
	if err != nil {
		log.Printf("调用PlantUML服务失败: %v", err)
		respondWithError(w, fmt.Sprintf("渲染失败: %v", err), http.StatusInternalServerError)
		return
	}
	
	response := PlantUMLResponse{
		Success:   true,
		Message:   "渲染成功",
		ImageData: imageData,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 示例代码处理器
func examplesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}
	
	examples := []PlantUMLExample{
		{
			Name: "简单序列图",
			Description: "基本的序列图示例",
			Code: `@startuml
Alice -> Bob: 认证请求
Bob --> Alice: 认证响应

Alice -> Bob: 另一个认证请求
Alice <-- Bob: 另一个认证响应
@enduml`,
		},
		{
			Name: "用例图",
			Description: "系统用例图示例",
			Code: `@startuml
left to right direction
actor 用户 as u
rectangle 系统 {
  usecase "登录" as UC1
  usecase "查看资料" as UC2
  usecase "编辑资料" as UC3
}

u --> UC1
u --> UC2
u --> UC3
@enduml`,
		},
		{
			Name: "类图",
			Description: "面向对象类图示例",
			Code: `@startuml
class 动物 {
  +名称: String
  +年龄: int
  +移动()
}

class 狗 {
  +品种: String
  +叫()
}

class 猫 {
  +颜色: String
  +抓老鼠()
}

动物 <|-- 狗
动物 <|-- 猫
@enduml`,
		},
		{
			Name: "活动图",
			Description: "业务流程活动图",
			Code: `@startuml
start
:用户登录;
if (验证成功?) then (是)
  :显示主页面;
  :选择功能;
  if (编辑?) then (是)
    :编辑数据;
  else (否)
    :查看数据;
  endif
else (否)
  :显示错误信息;
endif
stop
@enduml`,
		},
	}
	
	response := ExampleResponse{Examples: examples}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 调用PlantUML服务（仅支持SVG）
func callPlantUMLService(code, outputType string) (string, error) {
	// 构建请求URL - 固定为SVG
	endpoint := fmt.Sprintf("%s/svg", config.PlantUMLURL)
	
	// 创建POST请求
	resp, err := http.Post(endpoint, "text/plain; charset=utf-8", strings.NewReader(code))
	if err != nil {
		return "", fmt.Errorf("请求PlantUML服务失败: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("PlantUML服务返回错误: %d", resp.StatusCode)
	}
	
	// 读取响应数据
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应数据失败: %v", err)
	}
	
	// 直接返回SVG内容，不进行URL编码
	// 前端会处理SVG的显示
	svgContent := string(data)
	
	// 简单验证SVG内容
	if !strings.Contains(svgContent, "<svg") {
		return "", fmt.Errorf("PlantUML服务返回的不是有效的SVG内容")
	}
	
	return svgContent, nil
}

// 错误响应帮助函数
func respondWithError(w http.ResponseWriter, message string, statusCode int) {
	response := PlantUMLResponse{
		Success: false,
		Message: message,
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
} 
