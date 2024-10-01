class GpApp {
    static components = {};
    static data = {};

    async created() {}

    constructor(appElementId, data = {}, methods = {}) {
        this.appElement = document.getElementById(appElementId);
        this.data = { ...data };
        this.methods = { ...methods };
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
            // this.updateDOM();
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
        this.setDOMAttributes(this.virtualDOM, null);
        this.attachEventDelegation();
        this.updateDOM();
    }

    attachEventDelegation() {
        this.appElement.addEventListener('click', event => this.delegateDynamicEvent(event, 'click'));
        this.appElement.addEventListener('input', event => this.delegateDynamicEvent(event, 'input'));
        // Add other events like 'change', 'focus', etc.
    }

    delegateDynamicEvent(event, eventType) {
        const target = event.target.closest(`[data-e]`);
        if (target) {
            const [eventKey, methodName] = target.dataset.e.split(':');
            if (eventKey === eventType && this.methods[methodName]) {
                this.methods[methodName].call(this, event);
            } else if (!this.methods[methodName]) {
                console.error(`Method ${methodName} is not defined.`);
            }
        }
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
            this.setDOMAttributes(clonedTemplate, { [item]: dataItem });
    
            this.removeDataAttributes(clonedTemplate);
            fragment.appendChild(clonedTemplate);
        });
        
        parentEl.replaceChild(fragment, element); 
    }

    resolveDataPath(path) {
        return path.split('.').reduce((acc, curr) => acc && acc[curr], this);
    }
    setDOMAttributes(template, data) {
        const attributeMap = {
            'data-gp-html': 'innerHTML',
            'data-gp-src': 'src',
            'data-gp-alt': 'alt',
            'data-gp-href': 'href'
        };
    
        Object.keys(attributeMap).forEach(attr => {
            const elements = template.querySelectorAll(`[${attr}]`);
            let dataKeyName = "gp" + attr.slice(8, 9).toUpperCase() + attr.slice(9);
            
            elements.forEach(ele => {
                // const dataKey = ele.dataset[attr.split('-')[2]];
                const dataKey = ele.dataset[dataKeyName];
                this.setAttributeVaules(attributeMap[attr], ele, dataKey, data);               
                if (attr === 'data-gp-src' && ele.dataset.gpAlt) {
                    const altKey = ele.dataset.gpAlt;
                    this.setAttributeVaules('alt', ele, altKey, data);
                }
            });
        });
    }

    setAttributeVaules(attribute, element, dataKey, data = null) {
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
    resolvedUrlPath(absolutePath) {
        return  location.origin.includes('github.io') ? `${location.origin}/${location.pathname.split('/')[1]}${absolutePath}` : `${location.origin}${absolutePath}`;
    }
    async loadHTML(url, options={}) {
        try {
            const resovedUrl = this.resolvedUrlPath(url)
            const response = await fetch(resovedUrl, options);
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
