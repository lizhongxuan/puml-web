// SVG点击处理功能
class SVGClickHandler {
    constructor(editor) {
        this.editor = editor;
    }

    // 显示SVG并添加点击支持
    displaySVGWithClickSupport(svgContent, previewContent) {
        try {
            // 创建容器
            const container = document.createElement('div');
            container.innerHTML = svgContent;
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            
            const svgElement = container.querySelector('svg');
            if (svgElement) {
                svgElement.style.maxWidth = '100%';
                svgElement.style.height = 'auto';
                svgElement.style.cursor = 'pointer';
                
                // 为SVG中的元素添加点击事件
                this.addSVGClickListeners(svgElement);
            }
            
            previewContent.innerHTML = '';
            previewContent.appendChild(container);
            
        } catch (error) {
            console.error('SVG解析失败:', error);
            // 显示错误信息
            previewContent.innerHTML = `
                <div class="error-message">
                    <strong>SVG显示失败</strong><br>
                    ${error.message}
                </div>
            `;
        }
    }

    // 为SVG元素添加点击监听器
    addSVGClickListeners(svgElement) {
        const clickableElements = svgElement.querySelectorAll('text, rect, ellipse, circle, polygon, path, g[class*="participant"], g[class*="usecase"], g[class*="class"]');
        
        clickableElements.forEach(element => {
            element.style.cursor = 'pointer';
            element.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const elementName = this.extractElementName(element);
                if (elementName) {
                    this.jumpToCodeElement(elementName);
                }
            });
            
            element.addEventListener('mouseenter', () => {
                element.style.opacity = '0.7';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.opacity = '1';
            });
        });
    }

    // 提取元素名称
    extractElementName(element) {
        let elementName = '';
        
        if (element.tagName === 'text') {
            elementName = element.textContent.trim();
        } else {
            const textElement = element.querySelector('text');
            if (textElement) {
                elementName = textElement.textContent.trim();
            }
        }
        
        return elementName;
    }

    // 跳转到代码中的对应元素
    jumpToCodeElement(elementName) {
        const code = this.editor.codeEditor.value;
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            const searchName = elementName.toLowerCase();
            
            if (line.includes(searchName)) {
                this.jumpToLine(i + 1);
                this.editor.updateStatus(`已跳转到包含 "${elementName}" 的代码行`, 'success');
                return;
            }
        }
        
        this.editor.updateStatus(`未找到包含 "${elementName}" 的代码行`, 'error');
    }

    // 跳转到指定行号
    jumpToLine(lineNumber) {
        const lines = this.editor.codeEditor.value.split('\n');
        if (lineNumber > 0 && lineNumber <= lines.length) {
            let charPosition = 0;
            for (let i = 0; i < lineNumber - 1; i++) {
                charPosition += lines[i].length + 1;
            }
            
            this.editor.codeEditor.focus();
            this.editor.codeEditor.setSelectionRange(charPosition, charPosition + lines[lineNumber - 1].length);
            
            const lineHeight = 20;
            const scrollTop = Math.max(0, (lineNumber - 1) * lineHeight - this.editor.codeEditor.clientHeight / 2);
            this.editor.codeEditor.scrollTop = scrollTop;
        }
    }
}
