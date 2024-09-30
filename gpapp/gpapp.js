class GpApp {
    static components = {};
    static data = {};

    async created() {}

    constructor(appElementId, data = {}, method = {}) {
        this.appElement = document.getElementById(appElementId);
        this.data = { ...data };
        this.components = {};
        this.htmlText = null;
        this.virtualDOM = null;
        this.resume = null;
        this.darkMode = false;
        this.directives = ['data-gp-html', 'data-gp-for', 'data-gp-src', 'data-gp-href', 'data-gp-alt'];
        this.templates = { html: [], for: [], src: [], link: [], alt: [] };
    }

    async loadApp() {
        try {
            this.virtualDOM = this.appElement;
            await this.loadComponents(this.components);
            await this.created();
            this.renderDOM();
            this.updateDOM();
        } catch (error) {
            console.error("Error:", error.message);
        }
    }

    createVirtualDOM(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv;
    }

    async fetchData(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error("An error occurred while fetching data.");
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    renderDOM() {
        this.setDocumentLoops();
        this.setDocumentInnerHTML(this.virtualDOM, null);
        this.setDOMImgScr(this.virtualDOM, null);
        this.setAnchorHref(this.virtualDOM, null);
        this.updateDOM();  
    }

    setDocumentLoops() {
        const loops = this.virtualDOM.querySelectorAll("[data-gp-for]");
        loops.forEach(element => {
            const dataKey = element.dataset.gpFor;
            this.populateTemplateLoop(element, dataKey);
        });
    }

    populateTemplateLoop(element, dataKey) {
        const [item, collectionPath] = dataKey.split(' of ');
        const collection = this.resolveDataPath(collectionPath);
        
        if (!Array.isArray(collection)) return; 

        const parentEl = element.parentElement;
        const fragment = document.createDocumentFragment(); 

        collection.forEach(dataItem => {
            const clonedTemplate = element.cloneNode(true);
            this.setDocumentInnerHTML(clonedTemplate, { [item]: dataItem });
            this.setImageSrc(clonedTemplate, { [item]: dataItem });
            this.removeDataAttributes(clonedTemplate);
            fragment.appendChild(clonedTemplate);
        });
        
        parentEl.replaceChild(fragment, element); 
    }

    resolveDataPath(path) {
        return path.split('.').reduce((acc, curr) => acc && acc[curr], this);
    }

    setDocumentInnerHTML(template, data) {
        const elements = template.querySelectorAll("[data-gp-html]");
        elements.forEach(ele => {
            const dataKey = ele.dataset.gpHtml;
            this.setDOMAttribute('innerHTML', ele, dataKey, data);
        });
    }

    setImageSrc(template, data) {
        const elements = template.querySelectorAll("[data-gp-src]");
        elements.forEach(ele => {
            const dataKey = ele.dataset.gpSrc;
            const altKey = ele.dataset.gpAlt;
            this.setDOMAttribute('src', ele, dataKey, data);
            if (altKey) {
                this.setDOMAttribute('alt', ele, altKey, data);
            }          
        });
    }

    setDOMAttribute(attribute, element, dataKey, data = null) {
        if (!element || !dataKey) return;
        const keys = dataKey.split('.');
        data = data || { [keys[0]]: this[keys[0]] };

        for (const key of keys) {
            if (data && key in data) {       
                data = data[key];
            } else { 
                data = null; 
                break;
            } 
        }

        element[attribute] = data !== null && data !== undefined ? data : '';
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.appElement.classList.toggle("darkMode", this.darkMode);
    }

    removeDataAttributes(element) {
        const elements = element.querySelectorAll('*');
        elements.forEach(el => {
            const attributesToRemove = [];
            for (let attr of el.attributes) {
                if (attr.name.startsWith('data-gp-')) {
                    attributesToRemove.push(attr.name);
                }
            }
            attributesToRemove.forEach(attrName => {
                el.removeAttribute(attrName);
            });
        });
    }
    
    updateDOM() {
        this.appElement.innerHTML = this.virtualDOM.innerHTML; 
    }

    async loadHTML(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
            return await response.text();
        } catch (error) {
            console.error('Error fetching HTML:', error);
            return '';
        }
    }

    async loadComponent(component) {
        const elements = this.virtualDOM.querySelectorAll(`[data-gp-component="${component[0]}"]`);
        const componentHtml = await this.loadHTML(component[1]);
        
        if (componentHtml) {
            const template = this.createVirtualDOM(componentHtml);
            elements.forEach(el => {
                el.outerHTML = template.innerHTML; // Replace the element directly with the inner HTML
            });
        } else {
            console.error(`Failed to load component: ${component[0]}`);
        }
    }
    
    async loadComponents(components) {
        const componentMap = Object.entries(components);
        if (componentMap.length <= 0) return;
        for (const component of componentMap) {
            await this.loadComponent(component);
        }
    }
}
