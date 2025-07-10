// PlantUML在线编辑器 JavaScript - 仅支持SVG格式
class PlantUMLEditor {
    constructor() {
        console.log('PlantUMLEditor 构造函数开始');
        
        this.initializeElements();
        this.bindEvents();
        this.loadExamples();
        this.updateStatus('准备就绪', 'default');
        
        // 检查SVGClickHandler是否可用
        if (typeof SVGClickHandler === 'undefined') {
            console.error('SVGClickHandler 类未找到！请检查svg-click-handler.js是否正确加载');
            this.updateStatus('SVG处理模块加载失败', 'error');
            return;
        }
        
        // 初始化SVG点击处理器
        try {
            this.svgClickHandler = new SVGClickHandler(this);
            console.log('SVGClickHandler 初始化成功');
        } catch (error) {
            console.error('SVGClickHandler 初始化失败:', error);
            this.updateStatus('SVG处理器初始化失败', 'error');
        }
    }

    // 初始化DOM元素引用
    initializeElements() {
        this.codeEditor = document.getElementById('codeEditor');
        this.renderBtn = document.getElementById('renderBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.exampleSelect = document.getElementById('exampleSelect');
        this.outputType = document.getElementById('outputType');
        this.previewContent = document.getElementById('previewContent');
        this.status = document.getElementById('status');
    }

    // 绑定事件监听器
    bindEvents() {
        // 渲染按钮点击事件
        this.renderBtn.addEventListener('click', () => this.renderDiagram());
        
        // 清空按钮点击事件
        this.clearBtn.addEventListener('click', () => this.clearEditor());
        
        // 示例选择事件
        this.exampleSelect.addEventListener('change', (e) => this.loadExample(e.target.value));
        
        // 键盘快捷键：Ctrl+Enter 渲染
        this.codeEditor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.renderDiagram();
            }
        });

        // 代码变化时清除之前的状态
        this.codeEditor.addEventListener('input', () => {
            if (this.status.textContent.includes('成功') || this.status.textContent.includes('失败')) {
                this.updateStatus('已修改，点击渲染查看结果', 'default');
            }
        });
    }

    // 加载示例代码列表
    async loadExamples() {
        try {
            const response = await fetch('/api/examples');
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            this.populateExampleSelect(data.examples);
        } catch (error) {
            console.error('加载示例失败:', error);
            this.updateStatus('加载示例失败', 'error');
        }
    }

    // 填充示例选择框
    populateExampleSelect(examples) {
        // 清空现有选项（保留默认选项）
        while (this.exampleSelect.children.length > 1) {
            this.exampleSelect.removeChild(this.exampleSelect.lastChild);
        }

        // 添加示例选项
        examples.forEach((example, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = example.name;
            option.title = example.description;
            this.exampleSelect.appendChild(option);
        });

        // 存储示例数据供后续使用
        this.examples = examples;
    }

    // 加载选中的示例
    loadExample(index) {
        if (index === '' || !this.examples) return;
        
        const example = this.examples[parseInt(index)];
        if (example) {
            this.codeEditor.value = example.code;
            this.updateStatus(`已加载示例: ${example.name}`, 'success');
            
            // 焦点回到编辑器
            this.codeEditor.focus();
        }
    }

    // 清空编辑器
    clearEditor() {
        if (confirm('确定要清空编辑器内容吗？')) {
            this.codeEditor.value = '';
            this.previewContent.innerHTML = '<div class="placeholder">点击"渲染图表"按钮查看结果</div>';
            this.updateStatus('编辑器已清空', 'default');
            this.exampleSelect.value = '';
            this.codeEditor.focus();
        }
    }

    // 渲染PlantUML图表（仅SVG）
    async renderDiagram() {
        const code = this.codeEditor.value.trim();
        
        if (!code) {
            this.updateStatus('请输入PlantUML代码', 'error');
            this.codeEditor.focus();
            return;
        }

        // 更新状态为加载中
        this.updateStatus('正在渲染SVG图表...', 'loading');
        this.renderBtn.disabled = true;
        
        // 添加加载动画
        const originalText = this.renderBtn.textContent;
        this.renderBtn.innerHTML = '<span class="loading-spinner"></span> 渲染中...';

        try {
            const response = await fetch('/api/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    type: 'svg'  // 固定为SVG
                })
            });

            const result = await response.json();

            if (result.success) {
                this.displaySVGResult(result.imageData);
                this.updateStatus('SVG渲染成功！点击图表元素可跳转到对应代码', 'success');
            } else {
                this.displayError(result.message);
                this.updateStatus(`渲染失败: ${result.message}`, 'error');
            }

        } catch (error) {
            console.error('渲染请求失败:', error);
            this.displayError(`网络错误: ${error.message}`);
            this.updateStatus('网络请求失败', 'error');
        } finally {
            // 恢复按钮状态
            this.renderBtn.disabled = false;
            this.renderBtn.textContent = originalText;
        }
    }

    // 显示SVG渲染结果
    displaySVGResult(svgData) {
        console.log('开始显示SVG结果');
        
        // 检查SVG点击处理器是否可用
        if (!this.svgClickHandler) {
            console.warn('SVG点击处理器不可用，使用简单显示模式');
            this.displaySimpleSVG(svgData);
            return;
        }
        
        // 使用SVG点击处理器显示结果
        try {
            this.svgClickHandler.displaySVGWithClickSupport(svgData, this.previewContent);
        } catch (error) {
            console.error('SVG点击处理器显示失败:', error);
            this.displaySimpleSVG(svgData);
        }
    }

    // 简单SVG显示（无点击功能）
    displaySimpleSVG(svgData) {
        try {
            const container = document.createElement('div');
            container.innerHTML = svgData;
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            
            const svgElement = container.querySelector('svg');
            if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
            }
            
            this.previewContent.innerHTML = '';
            this.previewContent.appendChild(container);
            
            console.log('SVG 简单显示模式完成');
        } catch (error) {
            console.error('简单SVG显示也失败:', error);
            this.displayError('SVG显示失败: ' + error.message);
        }
    }

    // 显示错误信息
    displayError(message) {
        this.previewContent.innerHTML = `
            <div class="error-message">
                <strong>SVG渲染失败</strong><br>
                ${this.escapeHtml(message)}
                <br><br>
                <small>提示：请检查PlantUML代码语法是否正确，确保以@startuml开始，@enduml结束</small>
            </div>
        `;
    }

    // 更新状态显示
    updateStatus(message, type = 'default') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    // HTML转义函数
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 获取当前代码
    getCurrentCode() {
        return this.codeEditor.value;
    }

    // 设置代码
    setCode(code) {
        this.codeEditor.value = code;
    }
}

// 页面加载完成后初始化编辑器
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化PlantUML编辑器');
    
    // 初始化PlantUML编辑器
    window.plantUMLEditor = new PlantUMLEditor();
    
    console.log('PlantUML在线编辑器已初始化 - 专用SVG模式');
    console.log('快捷键: Ctrl+Enter 渲染图表');
    console.log('提示: 点击SVG图表元素可跳转到对应代码行');
});

// 全局错误处理
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    if (window.plantUMLEditor) {
        window.plantUMLEditor.updateStatus('发生未知错误', 'error');
    }
});

// 网络状态监测
window.addEventListener('online', () => {
    if (window.plantUMLEditor) {
        window.plantUMLEditor.updateStatus('网络连接已恢复', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.plantUMLEditor) {
        window.plantUMLEditor.updateStatus('网络连接断开', 'error');
    }
});
